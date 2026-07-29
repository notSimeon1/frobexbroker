// Lightweight client-side mock for payment methods, deposits and receipts.
// Stores data in localStorage so the UI can be exercised without Supabase.

type PaymentMethod = {
  id: string;
  method_key: string;
  method_name: string;
  identifier_label: string;
  recipient_name: string;
  identifier: string;
  is_active: boolean;
  sort_order?: number;
  notes?: string | null;
};

type Deposit = {
  id: string;
  user_id: string;
  user_email?: string | null;
  amount: number;
  base_amount?: number;
  gas_fee_amount?: number;
  total_payable?: number;
  crypto_currency?: string;
  payment_method?: string;
  payment_method_key?: string;
  receipt_path?: string; // key for mock receipts store
  status: "pending" | "approved" | "rejected" | "confirmed";
  expires_at?: string | null;
  created_at: string;
};

const PM_KEY = "mock_payment_methods_v1";
const DEPOSIT_KEY = "mock_deposits_v1";
const RECEIPT_KEY = "mock_receipts_v1"; // map path -> dataUrl

function read<T>(k: string): T | null {
  try { const s = localStorage.getItem(k); return s ? JSON.parse(s) as T : null; } catch { return null; }
}
function write(k: string, v: any) { localStorage.setItem(k, JSON.stringify(v)); }

function uid(prefix = "id") { return `${prefix}_${Math.random().toString(36).slice(2,9)}`; }

export const mockSupabase = {
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    let cur = read<PaymentMethod[]>(PM_KEY);
    if (!cur || cur.length === 0) {
      cur = [
        { id: uid("pm"), method_key: "cash_app", method_name: "Cash App", identifier_label: "Handle", recipient_name: "Frobex Treasury", identifier: "$frobex", is_active: true, sort_order: 10 },
        { id: uid("pm"), method_key: "paypal", method_name: "PayPal", identifier_label: "Email", recipient_name: "Frobex Treasury", identifier: "deposits@frobex.io", is_active: true, sort_order: 20 },
        { id: uid("pm"), method_key: "zelle", method_name: "Zelle", identifier_label: "Email/Phone", recipient_name: "Frobex Treasury", identifier: "deposits@frobex.io", is_active: true, sort_order: 30 },
        { id: uid("pm"), method_key: "chime", method_name: "Chime", identifier_label: "Account/Handle", recipient_name: "Frobex Treasury", identifier: "deposits@frobex.io", is_active: true, sort_order: 40 },
        { id: uid("pm"), method_key: "apple_pay", method_name: "Apple Pay", identifier_label: "Apple Pay", recipient_name: "Frobex Treasury", identifier: "deposits@frobex.io", is_active: true, sort_order: 50 },
        { id: uid("pm"), method_key: "venmo", method_name: "Venmo", identifier_label: "Handle", recipient_name: "Frobex Treasury", identifier: "@frobex", is_active: true, sort_order: 60 },
        { id: uid("pm"), method_key: "bank_wire", method_name: "Bank Wire", identifier_label: "Account number", recipient_name: "Frobex Treasury", identifier: "123456789", is_active: true, sort_order: 70 },
      ];
      write(PM_KEY, cur);
    }
    return cur.sort((a,b) => (a.sort_order||0) - (b.sort_order||0));
  },

  async upsertPaymentMethod(m: Partial<PaymentMethod> & { id?: string }) {
    const cur = (read<PaymentMethod[]>(PM_KEY) ?? []);
    if (m.id) {
      const idx = cur.findIndex(x => x.id === m.id);
      if (idx >= 0) { cur[idx] = { ...cur[idx], ...(m as PaymentMethod) }; write(PM_KEY, cur); return cur[idx]; }
    }
    const nm: PaymentMethod = { id: uid('pm'), method_key: (m.method_key || uid('k')), method_name: m.method_name || 'Method', identifier_label: m.identifier_label || 'Identifier', recipient_name: m.recipient_name || '', identifier: m.identifier || '', is_active: m.is_active ?? true, sort_order: m.sort_order ?? (cur.length+1)*10, notes: m.notes };
    cur.push(nm); write(PM_KEY, cur); return nm;
  },

  async getPendingDeposits(): Promise<Deposit[]> {
    const cur = (read<Deposit[]>(DEPOSIT_KEY) ?? []);
    return cur.filter(d => d.status === 'pending');
  },

  async listDeposits(): Promise<Deposit[]> {
    return (read<Deposit[]>(DEPOSIT_KEY) ?? []).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async insertDeposit(payload: Omit<Deposit, 'id' | 'created_at' | 'status'> & { receiptFile?: File | null }): Promise<Deposit> {
    const cur = (read<Deposit[]>(DEPOSIT_KEY) ?? []);
    let path: string | undefined;
    if (payload.receiptFile) {
      const f = payload.receiptFile;
      path = `${payload.user_id}/${Date.now()}-${f.name}`;
      const dataUrl = await fileToDataUrl(f);
      const receipts = (read<Record<string,string>>(RECEIPT_KEY) ?? {});
      receipts[path] = dataUrl;
      write(RECEIPT_KEY, receipts);
    }
    const d: Deposit = {
      id: uid('dep'),
      created_at: new Date().toISOString(),
      status: 'pending',
      receipt_path: path,
      ...payload,
    } as Deposit;
    cur.push(d); write(DEPOSIT_KEY, cur); return d;
  },

  async adminDecideDeposit(id: string, status: 'approved' | 'rejected' | 'confirmed') {
    const cur = (read<Deposit[]>(DEPOSIT_KEY) ?? []);
    const idx = cur.findIndex(d => d.id === id);
    if (idx === -1) throw new Error('Not found');
    cur[idx].status = status as any;
    cur[idx].created_at = cur[idx].created_at; // keep
    write(DEPOSIT_KEY, cur);
    return cur[idx];
  },

  async getSignedUrl(path?: string) {
    if (!path) return null;
    const receipts = (read<Record<string,string>>(RECEIPT_KEY) ?? {});
    return receipts[path] ?? null;
  },

  async uploadReceipt(file: File, userId: string) {
    const path = `${userId}/${Date.now()}-${file.name}`;
    const dataUrl = await fileToDataUrl(file);
    const receipts = (read<Record<string,string>>(RECEIPT_KEY) ?? {});
    receipts[path] = dataUrl;
    write(RECEIPT_KEY, receipts);
    return path;
  }
};

function fileToDataUrl(f: File): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(String(reader.result));
    reader.onerror = (e) => rej(e);
    reader.readAsDataURL(f);
  });
}
