import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  Cloud,
  CreditCard,
  IndianRupee,
  Layers,
  LineChart,
  LogIn,
  LogOut,
  Plus,
  ReceiptText,
  Search,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";
import {
  calendarEvents,
  creditCards,
  netWorthItems,
  netWorthTrend,
  seedTransactions,
  subscriptions,
} from "./data/financeData";
import {
  hasFirebaseConfig,
  saveTransaction,
  seedCloudTransactions,
  signInWithGoogle,
  signOutUser,
  watchAuth,
  watchTransactions,
} from "./services/firebase";

const navItems = [
  { key: "dashboard", label: "Home", icon: Layers },
  { key: "transactions", label: "Spend", icon: ReceiptText },
  { key: "calendar", label: "Calendar", icon: CalendarDays },
  { key: "cards", label: "Cards", icon: CreditCard },
  { key: "networth", label: "Worth", icon: LineChart },
  { key: "parser", label: "SMS", icon: Sparkles },
];

const categories = ["Food", "Transport", "Shopping", "Bills", "Music", "Health", "Rent", "Investing", "Salary"];
const methods = ["UPI", "HDFC Bank", "SBI Cashback", "Amazon Pay ICICI", "ICICI Coral", "Cash"];

function formatInr(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(new Date(value));
}

function parseBankSms(text) {
  const amount = text.match(/(?:INR|Rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)/i);
  const merchant = text.match(/\b(?:to|at|from|by)\s+([A-Za-z0-9 &._-]{3,40}?)(?:\s+on|\s+via|\s+ref|\s+UPI|\.|$)/i);
  const lower = text.toLowerCase();
  const isIncome = /credited|received|deposited|refund/.test(lower);
  const isExpense = /debited|spent|paid|sent|purchase|transaction/.test(lower);
  const method = lower.includes("upi") ? "UPI" : lower.includes("card") ? "Credit Card" : "Bank";
  const rawMerchant = merchant?.[1]?.trim().replace(/\s+/g, " ") || "Parsed merchant";
  const parsedAmount = Number(amount?.[1]?.replace(/,/g, "") || 0);

  return {
    id: Date.now(),
    date: new Date().toISOString().slice(0, 10),
    type: isIncome && !isExpense ? "income" : "expense",
    category: isIncome && !isExpense ? "Salary" : "Uncategorized",
    merchant: rawMerchant,
    method,
    amount: parsedAmount,
    note: "Imported from pasted SMS",
  };
}

function App() {
  const [active, setActive] = useState("dashboard");
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState(hasFirebaseConfig ? "Connect Google to sync" : "Firebase config missing");
  const [cloudSeeded, setCloudSeeded] = useState(false);
  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem("moneyos-transactions");
    return saved ? JSON.parse(saved) : seedTransactions;
  });
  const [query, setQuery] = useState("");
  const [sms, setSms] = useState("HDFC Bank: Rs. 642 debited from your account to Zomato via UPI on 02-Jul. Ref 883920.");
  const [draft, setDraft] = useState({
    type: "expense",
    date: new Date().toISOString().slice(0, 10),
    category: "Food",
    merchant: "",
    method: "UPI",
    amount: "",
    note: "",
  });
  const [spendCategory, setSpendCategory] = useState("Food");

  useEffect(() => {
    return watchAuth((account) => {
      setUser(account);
      setAuthReady(true);
      setSyncStatus(account ? "Connecting to Firestore" : hasFirebaseConfig ? "Guest mode" : "Local only");
    });
  }, []);

  useEffect(() => {
    if (!user) {
      localStorage.setItem("moneyos-transactions", JSON.stringify(transactions));
    }
  }, [transactions, user]);

  useEffect(() => {
    if (!user) return undefined;
    setCloudSeeded(false);
    return watchTransactions(
      user.uid,
      async (snapshot) => {
        const cloudTransactions = snapshot.docs.map((item) => item.data());
        if (cloudTransactions.length === 0 && !cloudSeeded) {
          setCloudSeeded(true);
          await seedCloudTransactions(user.uid, transactions);
          setSyncStatus("Seeded cloud database");
          return;
        }
        setTransactions(cloudTransactions);
        setSyncStatus("Synced with Firestore");
      },
      () => setSyncStatus("Sync needs Firebase rules"),
    );
  }, [user]);

  const filtered = useMemo(() => {
    return transactions
      .filter((item) => `${item.merchant} ${item.category} ${item.method}`.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, query]);

  const metrics = useMemo(() => {
    const income = transactions.filter((t) => t.type === "income").reduce((sum, item) => sum + item.amount, 0);
    const expense = transactions.filter((t) => t.type === "expense").reduce((sum, item) => sum + item.amount, 0);
    const categoryTotals = transactions
      .filter((t) => t.type === "expense")
      .reduce((acc, item) => ({ ...acc, [item.category]: (acc[item.category] || 0) + item.amount }), {});
    const assets = netWorthItems.filter((i) => i.type === "asset").reduce((sum, item) => sum + item.amount, 0);
    const debt = netWorthItems.filter((i) => i.type === "debt").reduce((sum, item) => sum + item.amount, 0);
    return { income, expense, saved: income - expense, categoryTotals, netWorth: assets - debt, debt };
  }, [transactions]);

  const bestCard = useMemo(() => {
    return creditCards.find((card) => card.rewards.includes(spendCategory)) || creditCards[0];
  }, [spendCategory]);

  async function addTransaction(item) {
    if (!Number(item.amount)) return;
    const next = { ...item, id: Date.now(), amount: Number(item.amount) };
    setTransactions((current) => [next, ...current]);
    if (user) {
      setSyncStatus("Saving to Firestore");
      await saveTransaction(user.uid, next);
      setSyncStatus("Synced with Firestore");
    }
    setDraft({ ...draft, merchant: "", amount: "", note: "" });
  }

  async function handleLogin() {
    setSyncStatus("Opening Google sign-in");
    try {
      await signInWithGoogle();
    } catch (error) {
      setSyncStatus(error.message);
    }
  }

  async function handleLogout() {
    await signOutUser();
    setUser(null);
  }

  const parsedSms = parseBankSms(sms);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><IndianRupee size={20} /></div>
          <div>
            <strong>MoneyOS</strong>
            <span>Personal finance</span>
          </div>
        </div>
        <nav>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button className={active === item.key ? "active" : ""} key={item.key} onClick={() => setActive(item.key)}>
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="privacy">
          <ShieldCheck size={18} />
          <span>{user ? "Cloud sync enabled" : "Local-first data"}</span>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <p className="eyebrow">July 2026</p>
            <h1>Finance command center</h1>
          </div>
          <label className="search">
            <Search size={18} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search spends" />
          </label>
          <AuthPanel
            user={user}
            authReady={authReady}
            syncStatus={syncStatus}
            onLogin={handleLogin}
            onLogout={handleLogout}
          />
        </header>

        {(active === "dashboard" || active === "transactions") && (
          <section className="grid hero-grid">
            <Metric title="Income" value={formatInr(metrics.income)} icon={ArrowDownLeft} tone="mint" />
            <Metric title="Spent" value={formatInr(metrics.expense)} icon={ArrowUpRight} tone="red" />
            <Metric title="Saved" value={formatInr(metrics.saved)} icon={Banknote} tone="gold" />
            <Metric title="Net worth" value={formatInr(metrics.netWorth)} icon={WalletCards} tone="ink" />
          </section>
        )}

        <div className="content-grid">
          {(active === "dashboard" || active === "transactions") && (
            <>
              <section className="panel wide">
                <PanelTitle title="Spending Mirror" action={`${filtered.length} entries`} />
                <CategoryBars totals={metrics.categoryTotals} />
              </section>
              <section className="panel">
                <PanelTitle title="Add Transaction" action={<Plus size={17} />} />
                <TransactionForm draft={draft} setDraft={setDraft} onAdd={() => addTransaction(draft)} />
              </section>
              <section className="panel wide">
                <PanelTitle title="Recent Activity" action={formatInr(metrics.expense)} />
                <TransactionsTable items={filtered} />
              </section>
            </>
          )}

          {(active === "dashboard" || active === "calendar") && (
            <section className="panel">
              <PanelTitle title="Money Calendar" action="Upcoming" />
              <EventList />
            </section>
          )}

          {(active === "dashboard" || active === "parser") && (
            <section className="panel">
              <PanelTitle title="SMS Expense Parser" action="Paste" />
              <SmsParser sms={sms} setSms={setSms} parsed={parsedSms} onImport={() => addTransaction(parsedSms)} />
            </section>
          )}

          {(active === "dashboard" || active === "cards") && (
            <section className="panel wide">
              <PanelTitle title="Credit Card Optimizer" action={bestCard.name} />
              <CardOptimizer spendCategory={spendCategory} setSpendCategory={setSpendCategory} bestCard={bestCard} />
            </section>
          )}

          {(active === "dashboard" || active === "networth") && (
            <section className="panel wide">
              <PanelTitle title="Personal Net Worth" action={formatInr(metrics.netWorth)} />
              <NetWorth />
            </section>
          )}

          {(active === "dashboard" || active === "calendar") && (
            <section className="panel">
              <PanelTitle title="Subscriptions" action={formatInr(subscriptions.reduce((s, i) => s + i.cost, 0))} />
              <SubscriptionList />
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

function AuthPanel({ user, authReady, syncStatus, onLogin, onLogout }) {
  return (
    <div className="auth-panel">
      <div>
        <Cloud size={16} />
        <span>{syncStatus}</span>
      </div>
      {user ? (
        <button onClick={onLogout} title="Sign out">
          {user.photoURL && <img src={user.photoURL} alt="" />}
          <span>{user.displayName?.split(" ")[0] || "Account"}</span>
          <LogOut size={16} />
        </button>
      ) : (
        <button disabled={!authReady || !hasFirebaseConfig} onClick={onLogin}>
          <LogIn size={16} />
          <span>Google login</span>
        </button>
      )}
    </div>
  );
}

function Metric({ title, value, icon: Icon, tone }) {
  return (
    <article className={`metric ${tone}`}>
      <Icon size={20} />
      <span>{title}</span>
      <strong>{value}</strong>
    </article>
  );
}

function PanelTitle({ title, action }) {
  return (
    <div className="panel-title">
      <h2>{title}</h2>
      <span>{action}</span>
    </div>
  );
}

function CategoryBars({ totals }) {
  const rows = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...rows.map(([, value]) => value), 1);
  return (
    <div className="bars">
      {rows.map(([label, value]) => (
        <div className="bar-row" key={label}>
          <div><strong>{label}</strong><span>{formatInr(value)}</span></div>
          <div className="track"><i style={{ width: `${Math.max(8, (value / max) * 100)}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

function TransactionForm({ draft, setDraft, onAdd }) {
  const update = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  return (
    <div className="form-stack">
      <div className="segmented">
        {["expense", "income"].map((type) => (
          <button className={draft.type === type ? "selected" : ""} key={type} onClick={() => update("type", type)}>{type}</button>
        ))}
      </div>
      <input value={draft.merchant} onChange={(e) => update("merchant", e.target.value)} placeholder="Merchant or source" />
      <input value={draft.amount} onChange={(e) => update("amount", e.target.value)} inputMode="numeric" placeholder="Amount" />
      <div className="two">
        <select value={draft.category} onChange={(e) => update("category", e.target.value)}>{categories.map((c) => <option key={c}>{c}</option>)}</select>
        <select value={draft.method} onChange={(e) => update("method", e.target.value)}>{methods.map((m) => <option key={m}>{m}</option>)}</select>
      </div>
      <input type="date" value={draft.date} onChange={(e) => update("date", e.target.value)} />
      <button className="primary" onClick={onAdd}>Add entry</button>
    </div>
  );
}

function TransactionsTable({ items }) {
  return (
    <div className="table">
      {items.slice(0, 10).map((item) => (
        <div className="table-row" key={item.id}>
          <div><strong>{item.merchant}</strong><span>{formatDate(item.date)} · {item.category} · {item.method}</span></div>
          <b className={item.type}>{item.type === "income" ? "+" : "-"}{formatInr(item.amount)}</b>
        </div>
      ))}
    </div>
  );
}

function EventList() {
  return (
    <div className="list">
      {calendarEvents.map((event) => (
        <div className="list-item" key={`${event.date}-${event.title}`}>
          <time>{formatDate(event.date)}</time>
          <div><strong>{event.title}</strong><span>{event.kind}</span></div>
          <b>{formatInr(event.amount)}</b>
        </div>
      ))}
    </div>
  );
}

function SubscriptionList() {
  return (
    <div className="list">
      {subscriptions.map((item) => (
        <div className="list-item" key={item.name}>
          <time>{formatDate(item.renews)}</time>
          <div><strong>{item.name}</strong><span>{item.cycle} · {item.category}</span></div>
          <b>{formatInr(item.cost)}</b>
        </div>
      ))}
    </div>
  );
}

function SmsParser({ sms, setSms, parsed, onImport }) {
  return (
    <div className="form-stack">
      <textarea value={sms} onChange={(e) => setSms(e.target.value)} rows={5} />
      <div className="parsed">
        <span>{parsed.type}</span>
        <strong>{parsed.merchant}</strong>
        <b>{formatInr(parsed.amount)}</b>
      </div>
      <button className="primary" disabled={!parsed.amount} onClick={onImport}>Import SMS entry</button>
    </div>
  );
}

function CardOptimizer({ spendCategory, setSpendCategory, bestCard }) {
  return (
    <div className="cards-layout">
      <div className="form-stack">
        <select value={spendCategory} onChange={(e) => setSpendCategory(e.target.value)}>
          {["Food", "Transport", "Shopping", "Bills", "Fuel", "Travel", "Online"].map((item) => <option key={item}>{item}</option>)}
        </select>
        <div className="recommendation">
          <small>Recommended card</small>
          <strong>{bestCard.name}</strong>
          <span>Best for {bestCard.bestFor}. Due on {formatDate(bestCard.due)}.</span>
        </div>
      </div>
      <div className="card-stack">
        {creditCards.map((card) => (
          <article className="credit-card" key={card.name}>
            <strong>{card.name}</strong>
            <span>Outstanding {formatInr(card.outstanding)}</span>
            <meter max={card.limit} value={card.outstanding} />
          </article>
        ))}
      </div>
    </div>
  );
}

function NetWorth() {
  const max = Math.max(...netWorthTrend.map((i) => i.value));
  return (
    <div className="networth">
      <div className="spark-chart">
        {netWorthTrend.map((item) => (
          <div key={item.label}>
            <i style={{ height: `${(item.value / max) * 100}%` }} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      <div className="list compact">
        {netWorthItems.map((item) => (
          <div className="list-item" key={item.name}>
            <div><strong>{item.name}</strong><span>{item.type}</span></div>
            <b>{formatInr(item.amount)}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
