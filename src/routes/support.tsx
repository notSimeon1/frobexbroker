import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Send, Paperclip, Loader as Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/support")({
  component: SupportPage,
  head: () => ({ meta: [
    { title: "Support Live Chat — Frobex" },
    { name: "description", content: "Chat live with Frobex customer support." },
    { property: "og:title", content: "Support Live Chat — Frobex" },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ]}),
});

type Msg = { id: string; thread_id: string; user_id: string; sender: "user" | "support" | "bot"; body: string; attachment_url?: string | null; created_at: string; is_read: boolean };

const QUICK = ["Deposit Help", "Withdrawal Status", "KYC Verification", "Trade Issue"];

function SupportPage() {
  const { user } = useAuth();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      let { data: thread } = await supabase.from("support_threads").select("*").eq("user_id", user.id).maybeSingle();
      if (!thread) {
        const res = await supabase.from("support_threads").insert({ user_id: user.id, subject: "Customer Support" }).select().maybeSingle();
        thread = res.data as any;
        if (thread) {
          const first = user.user_metadata?.full_name?.split(" ")[0] || "there";
          await supabase.from("support_messages").insert({ thread_id: thread.id, user_id: user.id, sender: "bot",
            body: `Hello ${first}! Welcome to Frobex Support. How can we assist you with your trading account or deposits today?` });
        }
      }
      if (!thread) return;
      setThreadId(thread.id);
      const { data: msgs } = await supabase.from("support_messages").select("*").eq("thread_id", thread.id).order("created_at");
      setMessages((msgs as Msg[]) ?? []);
    })();
  }, [user?.id]);

  useEffect(() => {
    if (!threadId) return;
    const ch = supabase.channel("support-page-" + threadId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages", filter: `thread_id=eq.${threadId}` }, (p) => {
        const m = p.new as Msg;
        setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [threadId]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

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
    const { error: upErr } = await supabase.storage.from("support_attachments").upload(path, file);
    if (upErr) { toast.error(upErr.message); return; }
    const { data, error: urlErr } = await supabase.storage.from("support_attachments").createSignedUrl(path, 60 * 60 * 24);
    if (urlErr || !data?.signedUrl) { toast.error("Could not generate file link"); return; }
    const { error: msgErr } = await supabase.from("support_messages").insert({ thread_id: threadId, user_id: user.id, sender: "user", body: `📎 ${file.name}`, attachment_url: data.signedUrl });
    if (msgErr) toast.error(msgErr.message);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex flex-1 flex-col mx-auto w-full max-w-3xl px-4 py-4">
        <div className="rounded-2xl border border-border bg-card flex flex-1 flex-col overflow-hidden shadow-elegant">
          <div className="flex items-center gap-3 border-b border-border bg-gradient-hero/15 px-4 py-3">
            <div className="h-10 w-10 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground font-bold">CS</div>
            <div>
              <div className="font-semibold">Customer Support</div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                Online • Typically replies instantly
              </div>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto bg-background/30 px-4 py-4">
            {!user && <p className="text-center text-sm text-muted-foreground">Sign in to start a live chat.</p>}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${m.sender === "user" ? "bg-gradient-hero text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"}`}>
                  <div className="whitespace-pre-wrap break-words">{m.body}</div>
                  {m.attachment_url && <a href={m.attachment_url} target="_blank" rel="noreferrer" className="mt-1 block text-[11px] underline">Open attachment</a>}
                  <div className="mt-1 text-[10px] opacity-60">{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                </div>
              </div>
            ))}
            {messages.length <= 1 && user && (
              <div className="flex flex-wrap gap-2 pt-1">
                {QUICK.map((q) => (
                  <button key={q} onClick={() => send(q)} className="rounded-full border border-border bg-card px-3 py-1 text-xs hover:bg-accent">{q}</button>
                ))}
              </div>
            )}
          </div>

          {user && (
            <div className="flex items-center gap-2 border-t border-border p-2">
              <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
              <Button variant="ghost" size="icon" onClick={() => fileRef.current?.click()}><Paperclip className="h-4 w-4" /></Button>
              <input value={text} onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(text); } }}
                placeholder="Type your message…" className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
              <Button onClick={() => send(text)} disabled={sending || !text.trim()}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
