import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Paperclip, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Msg = { id: string; thread_id: string; user_id: string; sender: "user" | "support" | "bot"; body: string; attachment_url?: string | null; created_at: string; is_read: boolean };

const QUICK_REPLIES = ["Deposit Help", "Withdrawal Status", "KYC Verification", "Trade Issue"];
const STORAGE_KEY = "frobex_chat_pos";
const BUTTON_SIZE = 56; // px
const PANEL_WIDTH = 360; // px
const PANEL_HEIGHT = 520; // px

export function LiveChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Dragging state
  const dragging = useRef(false);
  const moved = useRef(false);
  const pointerId = useRef<number | null>(null);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);

  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  // Initialize position from localStorage (client-only)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.left === "number" && typeof parsed.top === "number") {
          setPos(parsed);
          return;
        }
      }
    } catch (e) { /* ignore */ }
    // default: bottom-right with some offset (set after mount so we have window)
    const left = Math.max(8, window.innerWidth - BUTTON_SIZE - 20);
    const top = Math.max(8, window.innerHeight - BUTTON_SIZE - 20);
    setPos({ left, top });
  }, []);

  // Ensure thread exists + load messages
  useEffect(() => {
    if (!user) return;
    (async () => {
      let { data: thread } = await supabase.from("support_threads").select("*").eq("user_id", user.id).maybeSingle();
      if (!thread) {
        const res = await supabase.from("support_threads").insert({ user_id: user.id, subject: "Customer Support" }).select().maybeSingle();
        thread = res.data as any;
        if (thread) {
          // Auto welcome
          const first = user.user_metadata?.full_name?.split(" ")[0] || "there";
          await supabase.from("support_messages").insert({
            thread_id: thread.id, user_id: user.id, sender: "bot",
            body: `Hello ${first}! Welcome to Frobex Support. How can we assist you with your trading account or deposits today?`,
          });
        }
      }
      if (!thread) return;
      setThreadId(thread.id);
      const { data: msgs } = await supabase.from("support_messages").select("*").eq("thread_id", thread.id).order("created_at");
      setMessages((msgs as Msg[]) ?? []);
      setUnread(((msgs as Msg[]) ?? []).filter((m) => m.sender !== "user" && !m.is_read).length);
    })();
  }, [user?.id]);

  // Realtime
  useEffect(() => {
    if (!threadId) return;
    const ch = supabase.channel("chat-" + threadId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages", filter: `thread_id=eq.${threadId}` }, (p) => {
        const m = p.new as Msg;
        setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
        if (m.sender !== "user" && !open) setUnread((u) => u + 1);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [threadId, open]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, open]);
  useEffect(() => { if (open && threadId) { setUnread(0); supabase.from("support_messages").update({ is_read: true }).eq("thread_id", threadId).neq("sender","user"); } }, [open, threadId]);

  const send = async (body: string) => {
    if (!body.trim() || !user || !threadId) return;
    setSending(true);
    try {
      const { error } = await supabase.from("support_messages").insert({ thread_id: threadId, user_id: user.id, sender: "user", body: body.trim() });
      if (error) throw error;
      setText("");
    } catch (e: any) { toast.error(e.message ?? "Could not send"); }
    finally { setSending(false); }
  };

  const upload = async (file: File) => {
    if (!user || !threadId) return;
    const path = `${user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("support-attachments").upload(path, file);
    if (error) { toast.error(error.message); return; }
    const { data } = await supabase.storage.from("support-attachments").createSignedUrl(path, 60 * 60 * 24);
    await supabase.from("support_messages").insert({ thread_id: threadId, user_id: user.id, sender: "user", body: `📎 ${file.name}`, attachment_url: data?.signedUrl });
  };

  // Pointer handlers for dragging the floating button
  useEffect(() => {
    function onPointerMove(e: PointerEvent) {
      if (!dragging.current || !lastPointer.current || !pos) return;
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) moved.current = true;
      const newLeft = Math.min(Math.max(8, pos.left + dx), window.innerWidth - BUTTON_SIZE - 8);
      const newTop = Math.min(Math.max(8, pos.top + dy), window.innerHeight - BUTTON_SIZE - 8);
      setPos({ left: newLeft, top: newTop });
      lastPointer.current = { x: e.clientX, y: e.clientY };
    }
    function onPointerUp() {
      if (dragging.current && pos) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
      }
      dragging.current = false;
      pointerId.current = null;
      lastPointer.current = null;
      // small timeout to allow click suppression
      setTimeout(() => { moved.current = false; }, 50);
    }
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [pos]);

  if (!user || pos === null) return null;

  // compute panel position so it appears near the button
  const panelLeft = (() => {
    const centered = pos.left - (PANEL_WIDTH - BUTTON_SIZE) / 2;
    return Math.min(Math.max(8, centered), window.innerWidth - PANEL_WIDTH - 8);
  })();
  const panelTop = (() => {
    const above = pos.top - PANEL_HEIGHT - 12;
    if (above >= 8) return above;
    // otherwise place below the button
    const below = pos.top + BUTTON_SIZE + 12;
    return Math.min(Math.max(8, below), window.innerHeight - PANEL_HEIGHT - 8);
  })();

  return (
    <>
      <button
        onPointerDown={(e) => {
          // start drag
          dragging.current = true;
          pointerId.current = (e as any).pointerId ?? null;
          lastPointer.current = { x: (e as any).clientX, y: (e as any).clientY };
          // capture pointer to ensure we get move/up events
          try { (e.target as HTMLElement).setPointerCapture?.((e as any).pointerId); } catch { }
        }}
        onClick={(e) => {
          // suppress click if it was a drag
          if (moved.current) { e.preventDefault(); e.stopPropagation(); return; }
          setOpen(true);
        }}
        className="fixed z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-hero shadow-glow hover:scale-105 transition-transform"
        aria-label="Live support"
        style={{ left: pos.left, top: pos.top, position: "fixed" }}
      >
        <MessageCircle className="h-6 w-6 text-primary-foreground" />
        {unread > 0 && <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">{unread}</span>}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="z-50 flex fixed flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-elegant"
            style={{ width: PANEL_WIDTH, height: PANEL_HEIGHT, left: panelLeft, top: panelTop }}
          >
            <div className="flex items-center justify-between border-b border-border bg-gradient-hero/20 px-4 py-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground font-bold text-sm">CS</div>
                  <div>
                    <div className="text-sm font-semibold">Customer Support</div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                      Online • Typically replies instantly
                    </div>
                  </div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 px-3 py-3 bg-background/40">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-xs ${m.sender === "user" ? "bg-gradient-hero text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"}`}>
                    <div className="whitespace-pre-wrap break-words">{m.body}</div>
                    {m.attachment_url && <a href={m.attachment_url} target="_blank" rel="noreferrer" className="mt-1 block text-[10px] underline">Open attachment</a>}
                    <div className="mt-1 text-[9px] opacity-60">{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                </div>
              ))}
              {messages.length <= 1 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {QUICK_REPLIES.map((q) => (
                    <button key={q} onClick={() => send(q)} className="rounded-full border border-border bg-card px-2.5 py-1 text-[10px] hover:bg-accent">{q}</button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 border-t border-border px-2 py-2">
              <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
              <Button variant="ghost" size="icon" onClick={() => fileRef.current?.click()}><Paperclip className="h-4 w-4" /></Button>
              <input value={text} onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(text); } }}
                placeholder="Type a message…" className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground" />
              <Button size="icon" onClick={() => send(text)} disabled={sending || !text.trim()}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
