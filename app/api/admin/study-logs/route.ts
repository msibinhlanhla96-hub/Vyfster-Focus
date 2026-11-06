import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { logId, start_time, end_time, module_code, description, adminUserId } = body;

    if (!logId || !start_time || !end_time || !adminUserId) {
      return NextResponse.json(
        { error: 'Missing required fields (logId, start_time, end_time, adminUserId).' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify requesting user is an admin
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', adminUserId)
      .single();

    if (profileError || userProfile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized: Only admins can edit resident study times.' },
        { status: 403 }
      );
    }

    const startDate = new Date(start_time);
    const endDate = new Date(end_time);

    if (endDate <= startDate) {
      return NextResponse.json(
        { error: 'End time must be after start time.' },
        { status: 400 }
      );
    }

    // Update the study log
    const { data, error } = await supabase
      .from('study_logs')
      .update({
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        module_code: module_code?.trim() || 'STUDY',
        description: description?.trim() || null,
      })
      .eq('id', logId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, log: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { logId, adminUserId } = body;

    if (!logId || !adminUserId) {
      return NextResponse.json(
        { error: 'Missing logId or adminUserId.' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', adminUserId)
      .single();

    if (userProfile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized: Only admins can delete resident study logs.' },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from('study_logs')
      .delete()
      .eq('id', logId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
