import { requireUser } from "@/lib/auth/requireUser";
import { getUserBusinessId } from "@/lib/db";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const tenantId = getUserBusinessId(auth.email);

  try {
    const bizId = tenantId;

    const tasks = db
      .prepare("SELECT * FROM tasks WHERE business_id = ? ORDER BY created_at DESC")
      .all(bizId) as any[];

    return NextResponse.json({
      success: true,
      businessId: bizId,
      tasks: tasks.map(t => ({
        id: t.id,
        title: t.title,
        owner: t.owner,
        gap: t.gap,
        priority: t.priority,
        status: t.status, // 'todo' | 'in_progress' | 'done'
        createdAt: t.created_at,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const tenantId = getUserBusinessId(auth.email);

  try {
    const body = await req.json();
    const { title, owner = "Founder", gap = "General Execution", priority = "medium", status = "todo" } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Task title is required" }, { status: 400 });
    }

    const targetBizId = tenantId;
    const taskId = `task_${Date.now()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO tasks (id, business_id, title, owner, gap, priority, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      taskId,
      targetBizId,
      title.trim(),
      owner,
      gap,
      priority,
      status,
      now
    );

    return NextResponse.json({
      success: true,
      task: {
        id: taskId,
        title: title.trim(),
        owner,
        gap,
        priority,
        status,
        createdAt: now,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const tenantId = getUserBusinessId(auth.email);

  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "id and status are required" }, { status: 400 });
    }

    if (!["todo", "in_progress", "done"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    db.prepare("UPDATE tasks SET status = ? WHERE id = ? AND business_id = ?").run(
      status,
      id,
      tenantId
    );

    return NextResponse.json({
      success: true,
      message: "Task updated",
      id,
      status,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const tenantId = getUserBusinessId(auth.email);

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    db.prepare("DELETE FROM tasks WHERE id = ? AND business_id = ?").run(id, tenantId);
    return NextResponse.json({ success: true, message: "Task deleted", id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

