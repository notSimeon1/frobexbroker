import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone, CircleAlert as AlertCircle, Info, Bell } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/announcements")({
  component: AnnouncementsPage,
  head: () => ({
    meta: [
      { title: "Announcements — Frobex" },
      { name: "description", content: "Platform announcements and updates." },
    ],
  }),
});

function AnnouncementsPage() {
  const { data: announcements } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_announcements")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 30000,
  });

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-hero shadow-glow">
            <Megaphone className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Announcements</h1>
            <p className="text-sm text-muted-foreground">Stay up to date with the latest platform news and updates.</p>
          </div>
        </div>
      </motion.div>

      {!announcements?.length ? (
        <Card className="p-10 text-center">
          <Bell className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">No announcements yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {announcements.map((a: any, i: number) => (
            <motion.div key={a.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className={`p-5 ${a.is_urgent ? "border-destructive/40 bg-destructive/5" : ""}`}>
                <div className="flex items-start gap-3">
                  {a.is_urgent ? (
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                  ) : (
                    <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{a.title}</h3>
                      {a.is_urgent && <Badge variant="destructive" className="text-[10px]">Urgent</Badge>}
                      <Badge variant="secondary" className="text-[10px]">{a.category}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{a.content}</p>
                    <div className="mt-2 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
