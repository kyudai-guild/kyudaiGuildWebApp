import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// 所属申請の審査（運営のみ）
//   body { action: 'approve' | 'reject', review_note?: string }
//
// 承認時:
//   - マスタに無い団体（organization_id が NULL）の申請なら、まず団体を作る
//   - profile_organizations に所属を追加する
// 却下時:
//   - review_note（理由）を残す。本人のプロフィール画面に表示される。
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: '管理者権限が必要です。' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const action = body.action;
    const reviewNote: string = (body.review_note ?? '').trim();

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: '不正なアクションです。' }, { status: 400 });
    }
    if (action === 'reject' && !reviewNote) {
      return NextResponse.json({ error: '却下理由を入力してください。' }, { status: 400 });
    }

    const { data: req, error: fetchError } = await supabase
      .from('organization_requests')
      .select('id, profile_id, organization_id, requested_name, status')
      .eq('id', id)
      .single();

    if (fetchError || !req) {
      return NextResponse.json({ error: '申請が見つかりません。' }, { status: 404 });
    }
    if (req.status !== 'pending') {
      return NextResponse.json({ error: 'この申請はすでに審査済みです。' }, { status: 409 });
    }

    let organizationId: string | null = req.organization_id;

    if (action === 'approve') {
      // マスタに無い団体の申請は、承認と同時に団体を作る
      if (!organizationId) {
        const name = (req.requested_name ?? '').trim();
        if (!name) {
          return NextResponse.json({ error: '団体名が記録されていません。' }, { status: 400 });
        }
        const { data: existing } = await supabase
          .from('organizations')
          .select('id')
          .eq('name', name)
          .maybeSingle();

        if (existing) {
          organizationId = existing.id;
        } else {
          const { data: created, error: createError } = await supabase
            .from('organizations')
            .insert({ name })
            .select('id')
            .single();
          if (createError || !created) {
            console.error('Error creating organization on approve:', createError);
            return NextResponse.json({ error: '団体の作成に失敗しました。' }, { status: 500 });
          }
          organizationId = created.id;
        }
      }

      const { error: grantError } = await supabase
        .from('profile_organizations')
        .upsert(
          { profile_id: req.profile_id, organization_id: organizationId, granted_by: user.id },
          { onConflict: 'profile_id,organization_id' }
        );
      if (grantError) {
        console.error('Error granting organization on approve:', grantError);
        return NextResponse.json({ error: '所属の付与に失敗しました。' }, { status: 500 });
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from('organization_requests')
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
        organization_id: organizationId,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_note: reviewNote || null,
      })
      .eq('id', id)
      .select('id, status, organization_id, review_note, reviewed_at')
      .single();

    if (updateError) {
      console.error('Error reviewing organization request:', updateError);
      return NextResponse.json({ error: '審査処理に失敗しました。' }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
