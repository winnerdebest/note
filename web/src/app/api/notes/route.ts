import { NextResponse, NextRequest } from 'next/server';
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
  delete mapped.id;
  delete mapped._id;
  delete mapped.createdAt;
  delete mapped.updatedAt;
  delete mapped.deletedAt;
  return mapped;
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const tag = searchParams.get('tag') || '';
    const deleted = searchParams.get('deleted') === 'true';

    let query = supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id);

    // Filter by soft delete status
    if (deleted) {
      query = query.not('deleted_at', 'is', null);
    } else {
      query = query.is('deleted_at', null);
    }

    // Search by title or content
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    // Filter by tag
    if (tag) {
      query = query.contains('tags', [tag]);
    }

    query = query
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false });

    let { data, error } = await query;

    // Graceful fallback if columns are missing (user hasn't run the migration)
    if (error && error.code === '42703') {
      console.warn('Columns missing, retrying without filters:', error.message);
      const fallbackQuery = supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('is_pinned', { ascending: false })
        .order('updated_at', { ascending: false });
      
      const { data: fallbackData, error: fallbackError } = await fallbackQuery;
      if (fallbackError) throw fallbackError;
      data = fallbackData;
      error = null;
    }

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      data: (data || []).map(mapNoteFromSupabase) 
    });
  } catch (error: any) {
    console.error('Supabase fetch error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const supabaseBody = mapNoteToSupabase(body);
    
    // Assign the note to the current authenticated user
    supabaseBody.user_id = user.id;

    const { data, error } = await supabase
      .from('notes')
      .insert([supabaseBody])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      data: mapNoteFromSupabase(data) 
    }, { status: 201 });
  } catch (error: any) {
    console.error('Supabase creation error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
