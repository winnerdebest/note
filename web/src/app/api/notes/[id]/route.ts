import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const mapNoteFromSupabase = (note: any) => ({
  ...note,
  isPinned: note.is_pinned,
  createdAt: note.created_at,
  updatedAt: note.updated_at,
  deletedAt: note.deleted_at || null,
  tags: note.tags || [],
});

const mapNoteToSupabase = (note: any) => {
  const mapped: any = { ...note };
  if ('isPinned' in mapped) {
    mapped.is_pinned = mapped.isPinned;
    delete mapped.isPinned;
  }
  delete mapped._id;
  delete mapped.createdAt;
  delete mapped.updatedAt;
  delete mapped.deletedAt;
  delete mapped.restore;
  return mapped;
};

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: mapNoteFromSupabase(data) });
  } catch (error: any) {
    console.error('Supabase fetch error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    // Handle restore from trash
    if (body.restore) {
      const { data, error } = await supabase
        .from('notes')
        .update({ deleted_at: null, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data: mapNoteFromSupabase(data) });
    }

    const supabaseBody = mapNoteToSupabase(body);
    supabaseBody.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('notes')
      .update(supabaseBody)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    // Fallback if tags or deleted_at columns are missing
    if (error && error.code === '42703') {
      console.warn('Columns missing, retrying update without tags/deleted_at:', error.message);
      delete supabaseBody.tags;
      delete supabaseBody.deleted_at;
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('notes')
        .update(supabaseBody)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (fallbackError) throw fallbackError;
      return NextResponse.json({ success: true, data: mapNoteFromSupabase(fallbackData) });
    }

    if (error) throw error;
    if (!data) return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: mapNoteFromSupabase(data) });
  } catch (error: any) {
    console.error('Supabase update error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const url = new URL(request.url);
    const permanent = url.searchParams.get('permanent') === 'true';

    if (permanent) {
      // Hard delete (permanently remove)
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    } else {
      // Soft delete (move to trash)
      const { error } = await supabase
        .from('notes')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error && error.code === '42703') {
        console.warn('deleted_at column missing, falling back to hard delete');
        const { error: fallbackError } = await supabase
          .from('notes')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);
        if (fallbackError) throw fallbackError;
      } else if (error) {
        throw error;
      }
    }

    return NextResponse.json({ success: true, data: {} });
  } catch (error: any) {
    console.error('Supabase delete error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
