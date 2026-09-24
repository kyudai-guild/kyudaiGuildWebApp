import { NextResponse, after } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { notifyQuestSubmitted } from '@/lib/slack';
import { validateQuestInput, MAX_OPEN_QUESTS_PER_ORG } from '@/lib/quest-form';

// 1回の取得で返すクエストの上限。
// 掲示板は全件を受け取ってクライアント側で絞り込む作りなので、
// 上限が無いとクエストが増えるほど重くなる。
// ここに達するようになったら、サーバー側のページングに切り替えること。
// （export すると Next.js のルートファイル規約に反するので外に出さない）
const BOARD_LIMIT = 300;

// 掲示板・審査画面が使う列。
//   - reward（報酬）は廃止したので読まない（既存データの列は残っている）
//   - 掲示者のメールアドレスは読まない。連絡先は依頼者が書いた
//     「問い合わせ先」（preferred_contact）だけを出す
//   - 当日の受け入れ担当者は別の表（quest_private_details）にあり、ここでは読まない
const BOARD_COLUMNS = `
  id, title, description, quest_type, max_applicants, tags, status,
  listing_duration_type, listing_end_date, effective_end_date,
  rejection_reason, reviewed_at, created_at, creator_id,
  preferred_contact, organization_id, organization_name,
  sessions, location, participation_fee, belongings, schedule, requirements,
  org_intro, appeal, photo_path,
  creator:creator_id (display_name),
  organization:organization_id (id, name, is_active),
  applications:quest_applications (id, status)
`;

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
      .select(BOARD_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(BOARD_LIMIT);

    // 管理者なら全件、一般ユーザーなら承認済みのみ
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    const isAdmin = profile?.role === 'admin';

    if (!isAdmin) {
      query = query.eq('status', 'approved');
    }

    const { data: quests, error } = await query;

    if (error) {
      console.error('Error fetching quests:', error);
      return NextResponse.json({ error: 'Failed to fetch quests' }, { status: 500 });
    }

    // 運営の審査画面には、掲示しない「当日の受け入れ担当者」も付ける。
    // 一般ユーザーには絶対に返さない。
    let privateById = new Map<string, { receiver_name: string; receiver_contact: string }>();
    if (isAdmin && quests && quests.length > 0) {
      const { data: privates } = await supabase
        .from('quest_private_details')
        .select('quest_id, receiver_name, receiver_contact')
        .in('quest_id', quests.map((q: any) => q.id));
      privateById = new Map((privates ?? []).map((p: any) => [p.quest_id, p]));
    }

    const result = (quests || []).map((q: any) => {
      const apps: { status: string }[] = q.applications ?? [];
      return {
        ...q,
        application_count: apps.length,
        // 定員は「承認した人数」で数える（見送った応募は枠を消費しない）
        accepted_count: apps.filter(a => a.status === 'accepted').length,
        applications: undefined,
        ...(isAdmin ? { private_details: privateById.get(q.id) ?? null } : {}),
      };
    });

    // 上限に達したことを黙って隠さない。
    if (result.length >= BOARD_LIMIT) {
      console.warn(`Quests: hit BOARD_LIMIT (${BOARD_LIMIT}). サーバー側ページングへの切り替えを検討すること。`);
    }

    return NextResponse.json(result);
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

    // 画面と同じ関数で確認する（画面を通さない送信でも同じ基準で弾く）
    const checked = validateQuestInput(await request.json(), { userId: user.id });
    if (!checked.ok) {
      return NextResponse.json({ error: checked.error }, { status: 400 });
    }
    const input = checked.value;

    // 主催団体の所属を確認する。
    // body の organization_id をそのまま信じると、他団体を騙れてしまう。
    // （DB側のトリガーでも同じ確認をしている）
    const { data: membership, error: membershipError } = await supabase
      .from('profile_organizations')
      .select('organization:organization_id (id, name, is_active)')
      .eq('profile_id', user.id)
      .eq('organization_id', input.organization_id)
      .maybeSingle();

    if (membershipError) {
      console.error('Error verifying organization membership:', membershipError);
      return NextResponse.json({ error: '所属団体の確認に失敗しました。' }, { status: 500 });
    }
    const org = (membership as any)?.organization;
    if (!org) {
      return NextResponse.json(
        { error: '選択された団体に所属していません。団体長か運営に、所属の追加を依頼してください。' },
        { status: 403 }
      );
    }
    if (org.is_active === false) {
      return NextResponse.json({ error: 'この団体は現在利用できません。' }, { status: 400 });
    }

    // 1団体あたりの未完了クエストの上限。
    // 審査待ちのクエストは本人と運営にしか見えない（RLS）ので、
    // 本人のセッションで数えると他のメンバーの審査待ちが漏れる。サーバー権限で数える。
    const admin = createAdminClient();
    if (admin) {
      const { count: openCount } = await admin
        .from('quests')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', org.id)
        .in('status', ['pending', 'approved']);
      if ((openCount ?? 0) >= MAX_OPEN_QUESTS_PER_ORG) {
        return NextResponse.json(
          { error: `「${org.name}」の未完了のクエストが上限（${MAX_OPEN_QUESTS_PER_ORG}件）に達しています。終わったクエストの完了報告をしてから申請してください。` },
          { status: 400 }
        );
      }
    }

    const { data: quest, error: insertError } = await supabase
      .from('quests')
      .insert({
        creator_id: user.id,
        organization_id: org.id,
        organization_name: org.name, // 申請時点のスナップショット（DB側でも上書きされる）
        title: input.title,
        quest_type: input.quest_type,
        description: input.description || null,
        tags: input.tags,
        max_applicants: input.max_applicants,
        sessions: input.sessions,
        location: input.location,
        participation_fee: input.participation_fee,
        belongings: input.belongings,
        schedule: input.schedule,
        requirements: input.requirements,
        preferred_contact: input.preferred_contact,
        org_intro: input.org_intro,
        appeal: input.appeal || null,
        photo_path: input.photo_path,
        // 掲示期間は「申込の締切」の日付指定のみ（n週間指定は廃止）
        listing_duration_type: 'date',
        listing_duration_weeks: null,
        listing_end_date: input.listing_end_date,
        guideline_confirmed_at: new Date().toISOString(),
        // 旧フォームの項目。報酬は廃止、九大メール公開のチェックは問い合わせ先に一本化
        reward: '',
        contact_email_public: false,
        status: 'pending',
      })
      .select('id, title, description, quest_type, max_applicants, organization_name, sessions, location, participation_fee')
      .single();

    if (insertError || !quest) {
      console.error('Error inserting quest:', insertError);
      // DB側のトリガーが出した理由（上限・所属など）はそのまま伝える
      const msg = insertError?.message && /[ぁ-んァ-ン一-龥]/.test(insertError.message)
        ? insertError.message
        : 'クエストの作成に失敗しました。';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // 掲示しない担当者情報は別の表へ。
    // 失敗したらクエストごと取り消す（担当者の決まっていないクエストは受け付けないため）。
    const { error: privateError } = await supabase
      .from('quest_private_details')
      .insert({
        quest_id: quest.id,
        receiver_name: input.receiver_name,
        receiver_contact: input.receiver_contact,
      });
    if (privateError) {
      console.error('Error inserting quest private details:', privateError);
      // quests には依頼者本人の削除ポリシーが無いので、サーバー権限で取り消す
      if (admin) await admin.from('quests').delete().eq('id', quest.id);
      return NextResponse.json({ error: '担当者情報の保存に失敗したため、申請を取り消しました。もう一度お試しください。' }, { status: 500 });
    }

    // 運営Slackへ即時通知。after() でレスポンス送出後に実行するので、
    // Slack が遅くても申請した人を待たせない。失敗しても申請は成立済み。
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/$/, '');
    after(async () => {
      await notifyQuestSubmitted({
        title: quest.title,
        description: quest.description,
        questType: quest.quest_type,
        maxApplicants: quest.max_applicants,
        organizationName: quest.organization_name,
        sessions: quest.sessions,
        location: quest.location,
        participationFee: quest.participation_fee,
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
