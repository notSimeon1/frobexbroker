import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Headphones } from "lucide-react";
import { notifyComplaint } from "@/lib/complaints.functions";

export const Route = createFileRoute("/support")({
  component: SupportPage,
  head: () => ({ meta: [{ title: "Support — Frobex" }] }),
});

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  subject: z.string().trim().min(3).max(150),
  message: z.string().trim().min(10).max(2000),
});

function SupportPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setBusy(true);
    try {
      const { error } = await supabase.from("complaints").insert({
        user_id: user?.id ?? null,
        name: parsed.data.name,
        email: parsed.data.email,
        subject: parsed.data.subject,
        message: parsed.data.message,
      });
      if (error) throw error;
      // Fire-and-forget email forwarding
      notifyComplaint({ data: parsed.data }).catch((err) => console.warn("email forward failed", err));
      setDone(true);
      toast.success("Ticket received. We'll be in touch.");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (err: any) {
      toast.error(err.message ?? "Could not submit ticket");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-hero shadow-glow">
            <Headphones className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold">How can we help?</h1>
          <p className="mt-2 text-sm text-muted-foreground">Send us a ticket. Our team responds within 1 business day.</p>
        </div>

        {done ? (
          <div className="rounded-2xl border border-success/30 bg-success/5 p-10 text-center shadow-sm">
            <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
            <h2 className="mt-4 text-xl font-semibold">Ticket submitted</h2>
            <p className="mt-2 text-sm text-muted-foreground">We received your message and notified our support team.</p>
            <Button className="mt-6" variant="outline" onClick={() => setDone(false)}>Submit another</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="rounded-2xl border border-border bg-gradient-card p-6 shadow-elegant space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={100} />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required maxLength={255} />
              </div>
            </div>
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required maxLength={150} />
            </div>
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" rows={6} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required maxLength={2000} />
            </div>
            <Button type="submit" className="w-full bg-gradient-hero" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit ticket
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
