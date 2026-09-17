import { NextResponse, after } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { notifyQuestSubmitted } from '@/lib/slack';

// 1人が同時に抱えられる審査待ちの件数。
// （export すると Next.js のルートファイル規約に反するので外に出さない）
const MAX_PENDING_QUESTS = 3;

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 掲示板はログインユーザー限定
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let query = supabase
      .from('quests')
      .select(`
        *,
        creator:creator_id (display_name, email),
        organization:organization_id (id, name, is_active),
        applications:quest_applications (id)
      `)
      .order('created_at', { ascending: false });

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

    // 完了報告していない掲示中の依頼がある間は、新しい依頼を出せない
    const { count: activeCount } = await supabase
      .from('quests')
      .select('id', { count: 'exact', head: true })
      .eq('creator_id', user.id)
      .eq('status', 'approved');
    if ((activeCount ?? 0) > 0) {
      return NextResponse.json(
        { error: '完了報告をしていない掲示中の依頼があります。マイクエストから「完了報告」をしてから、新しい依頼を申請してください。' },
        { status: 400 }
      );
    }

    // 審査待ちの件数にも上限を設ける。
    // 上の制限は status='approved' しか見ていないため、審査待ちのまま
    // 何件でも申請でき、運営の審査待ち行列と Slack 通知を一人で溢れさせられる。
    const { count: pendingCount } = await supabase
      .from('quests')
      .select('id', { count: 'exact', head: true })
      .eq('creator_id', user.id)
      .eq('status', 'pending');
    if ((pendingCount ?? 0) >= MAX_PENDING_QUESTS) {
      return NextResponse.json(
        { error: `審査待ちの依頼が${MAX_PENDING_QUESTS}件あります。審査の結果をお待ちください。` },
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
