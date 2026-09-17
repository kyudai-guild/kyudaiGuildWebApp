import { NextResponse, after } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { notifyQuestSubmitted } from '@/lib/slack';

// 1人が同時に抱えられる未完了の依頼（審査待ち + 掲示中）の件数。
// 以前は掲示中1件までだったが、実運用では不便なので緩めた。
// 上限自体は残す。無制限だと運営の審査待ち行列と Slack 通知を
// 一人で溢れさせられるため。
// （export すると Next.js のルートファイル規約に反するので外に出さない）
const MAX_OPEN_QUESTS = 10;

// 1回の取得で返すクエストの上限。
// 掲示板は全件を受け取ってクライアント側で絞り込む作りなので、
// 上限が無いとクエストが増えるほど重くなる。
// ここに達するようになったら、サーバー側のページングに切り替えること
// （切り捨てが起きたことは truncated で返している）。
const BOARD_LIMIT = 300;

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 掲示板はログインユーザー限定
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // select('*') をやめて画面が使う列だけにする。
    // reviewed_by / line_notified_at / completed_at は掲示板でも審査画面でも
    // 使っていないのに毎回運んでいた。
    // 併せて件数に上限を設ける。以前は無制限で、承認済みクエストが
    // 増えるほど掲示板を開くたびの転送量とDB負荷が線形に増えていた。
    let query = supabase
      .from('quests')
      .select(`
        id, title, description, quest_type, max_applicants, reward, tags, status,
        listing_duration_type, listing_duration_weeks, listing_end_date, effective_end_date,
        rejection_reason, reviewed_at, created_at, creator_id,
        contact_email_public, preferred_contact,
        organization_id, organization_name,
        creator:creator_id (display_name, email),
        organization:organization_id (id, name, is_active),
        applications:quest_applications (id)
      `)
      .order('created_at', { ascending: false })
      .limit(BOARD_LIMIT);

    // 管理者なら全件、一般ユーザーなら承認済みのみ
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      query = query.eq('status', 'approved');
    }

    const { data: quests, error } = await query;

    if (error) {
      console.error('Error fetching quests:', error);
      return NextResponse.json({ error: 'Failed to fetch quests' }, { status: 500 });
    }

    // 応募数を付加
    const questsWithCount = (quests || []).map(q => ({
      ...q,
      application_count: q.applications?.length || 0,
      applications: undefined, // 詳細は別APIで返す
    }));

    // 上限に達したことを黙って隠さない。
    // 「全件見えているつもりで一部しか見えていない」のが一番まずい。
    if (questsWithCount.length >= BOARD_LIMIT) {
      console.warn(`Quests: hit BOARD_LIMIT (${BOARD_LIMIT}). サーバー側ページングへの切り替えを検討すること。`);
    }

    return NextResponse.json(questsWithCount);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      quest_type,
      max_applicants,
      reward,
      tags,
      listing_duration_type,
      listing_duration_weeks,
      listing_end_date,
      contact_email_public,
      preferred_contact,
      organization_id,
    } = body;

    if (!title || !quest_type) {
      return NextResponse.json({ error: 'クエスト名とクエスト種別は必須です。' }, { status: 400 });
    }

    // どの団体としての申請かを確定させる。
    // quests の insert ポリシーは creator_id しか見ないため、ここで所属を検証しないと
    // body に任意の organization_id を混ぜて他団体を騙れてしまう。
    let organizationId: string | null = null;
    let organizationName: string | null = null;
    if (organization_id) {
      const { data: membership, error: membershipError } = await supabase
        .from('profile_organizations')
        .select('organization:organization_id (id, name, is_active)')
        .eq('profile_id', user.id)
        .eq('organization_id', organization_id)
        .maybeSingle();

      if (membershipError) {
        console.error('Error verifying organization membership:', membershipError);
        return NextResponse.json({ error: '所属団体の確認に失敗しました。' }, { status: 500 });
      }
      const org = (membership as any)?.organization;
      if (!org) {
        return NextResponse.json(
          { error: '選択された団体に所属していません。プロフィール画面から所属を申請してください。' },
          { status: 403 }
        );
      }
      if (org.is_active === false) {
        return NextResponse.json({ error: 'この団体は現在利用できません。' }, { status: 400 });
      }
      organizationId = org.id;
      // 団体名は申請時点のスナップショット。改名・無効化されても審査の記録が残る。
      organizationName = org.name;
    }

    // 未完了の依頼の件数を数える。
    // 審査待ちと掲示中をまとめて1つの上限にしている。以前は掲示中だけを
    // 見ていたため、審査待ちのままなら何件でも申請できてしまっていた。
    const { count: openCount } = await supabase
      .from('quests')
      .select('id', { count: 'exact', head: true })
      .eq('creator_id', user.id)
      .in('status', ['pending', 'approved']);
    if ((openCount ?? 0) >= MAX_OPEN_QUESTS) {
      return NextResponse.json(
        { error: `未完了の依頼が${MAX_OPEN_QUESTS}件あります。マイクエストから完了報告をしてから、新しい依頼を申請してください。` },
        { status: 400 }
      );
    }

    // 掲示期間のバリデーション
    if (listing_duration_type === 'weeks' && listing_duration_weeks) {
      if (listing_duration_weeks < 1 || listing_duration_weeks > 26) {
        return NextResponse.json({ error: '掲示期間は1〜26週間で指定してください。' }, { status: 400 });
      }
    }

    if (listing_duration_type === 'date' && listing_end_date) {
      const endDate = new Date(listing_end_date);
      const maxDate = new Date();
      maxDate.setMonth(maxDate.getMonth() + 6);
      if (endDate > maxDate) {
        return NextResponse.json({ error: '掲示期間は半年以内で指定してください。' }, { status: 400 });
      }
    }

    const { data: quest, error: insertError } = await supabase
      .from('quests')
      .insert({
        creator_id: user.id,
        title,
        description,
        quest_type,
        max_applicants: max_applicants || 1,
        reward: reward || '',
        tags: tags || [],
        listing_duration_type,
        listing_duration_weeks,
        listing_end_date,
        contact_email_public: contact_email_public !== false, // 既定で公開（オプトアウト式）
        preferred_contact: preferred_contact || null,
        organization_id: organizationId,
        organization_name: organizationName,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting quest:', insertError);
      return NextResponse.json({ error: 'クエストの作成に失敗しました。' }, { status: 500 });
    }

    // 運営Slackへ即時通知。after() でレスポンス送出後に実行するので、
    // Slack が遅くても申請した人を待たせない。失敗しても申請は成立済み。
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/$/, '');
    after(async () => {
      await notifyQuestSubmitted({
        title: quest.title,
        description: quest.description,
        questType: quest.quest_type,
        reward: quest.reward,
        maxApplicants: quest.max_applicants,
        organizationName: quest.organization_name,
        creatorId: user.id,
        creatorEmail: user.email ?? null,
        siteUrl,
      });
    });

    return NextResponse.json(quest);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
