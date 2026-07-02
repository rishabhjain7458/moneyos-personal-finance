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
  Target,
  Trash2,
  WalletCards,
} from "lucide-react";
import {
  budgets,
  calendarEvents,
  creditCards,
  goals,
  netWorthItems,
  netWorthTrend,
  seedTransactions,
  subscriptions,
} from "./data/financeData";
import {
  clearUserCollection,
  deleteUserDocument,
  hasFirebaseConfig,
  saveTransaction,
  saveUserDocument,
  signInWithGoogle,
  signOutUser,
  watchAuth,
  watchTransactions,
  watchUserCollection,
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
  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem("moneyos-transactions");
    return saved ? JSON.parse(saved) : seedTransactions;
  });
  const [subscriptionItems, setSubscriptionItems] = useState(subscriptions);
  const [calendarItems, setCalendarItems] = useState(calendarEvents);
  const [cardItems, setCardItems] = useState(creditCards);
  const [worthItems, setWorthItems] = useState(netWorthItems);
  const [worthTrend, setWorthTrend] = useState(netWorthTrend);
  const [budgetItems, setBudgetItems] = useState(budgets);
  const [goalItems, setGoalItems] = useState(goals);
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
  const [subscriptionDraft, setSubscriptionDraft] = useState({ name: "", cost: "", cycle: "Monthly", renews: new Date().toISOString().slice(0, 10), category: "Entertainment" });
  const [eventDraft, setEventDraft] = useState({ title: "", amount: "", date: new Date().toISOString().slice(0, 10), kind: "Bill" });
  const [cardDraft, setCardDraft] = useState({ name: "", due: new Date().toISOString().slice(0, 10), limit: "", outstanding: "", rewards: "Food, Shopping", bestFor: "" });
  const [worthDraft, setWorthDraft] = useState({ name: "", type: "asset", amount: "" });
  const [budgetDraft, setBudgetDraft] = useState({ category: "Food", limit: "" });
  const [goalDraft, setGoalDraft] = useState({ name: "", target: "", current: "", deadline: new Date().toISOString().slice(0, 10) });

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
    return watchTransactions(
      user.uid,
      (snapshot) => {
        const cloudTransactions = snapshot.docs.map((item) => ({ ...item.data(), _docId: item.id }));
        setTransactions(cloudTransactions);
        setSyncStatus(cloudTransactions.length ? "Synced with Firestore" : "Cloud database empty");
      },
      () => setSyncStatus("Sync needs Firebase rules"),
    );
  }, [user]);

  useEffect(() => {
    if (!user) {
      setSubscriptionItems(subscriptions);
      setCalendarItems(calendarEvents);
      setCardItems(creditCards);
      setWorthItems(netWorthItems);
      setWorthTrend(netWorthTrend);
      setBudgetItems(budgets);
      setGoalItems(goals);
      return undefined;
    }

    const subscriptionsUnsub = watchUserCollection(user.uid, "subscriptions", (snapshot) => {
      setSubscriptionItems(snapshot.docs.map((item) => ({ ...item.data(), _docId: item.id })).sort((a, b) => a.renews.localeCompare(b.renews)));
    }, () => setSyncStatus("Subscription sync failed"));
    const calendarUnsub = watchUserCollection(user.uid, "calendarEvents", (snapshot) => {
      setCalendarItems(snapshot.docs.map((item) => ({ ...item.data(), _docId: item.id })).sort((a, b) => a.date.localeCompare(b.date)));
    }, () => setSyncStatus("Calendar sync failed"));
    const cardsUnsub = watchUserCollection(user.uid, "creditCards", (snapshot) => {
      setCardItems(snapshot.docs.map((item) => ({ ...item.data(), _docId: item.id })).sort((a, b) => a.name.localeCompare(b.name)));
    }, () => setSyncStatus("Card sync failed"));
    const worthUnsub = watchUserCollection(user.uid, "netWorthItems", (snapshot) => {
      setWorthItems(snapshot.docs.map((item) => ({ ...item.data(), _docId: item.id })).sort((a, b) => a.name.localeCompare(b.name)));
    }, () => setSyncStatus("Net worth sync failed"));
    const trendUnsub = watchUserCollection(user.uid, "netWorthTrend", (snapshot) => {
      setWorthTrend(snapshot.docs.map((item) => ({ ...item.data(), _docId: item.id })).sort((a, b) => a.order - b.order));
    }, () => setSyncStatus("Trend sync failed"));
    const budgetUnsub = watchUserCollection(user.uid, "budgets", (snapshot) => {
      setBudgetItems(snapshot.docs.map((item) => ({ ...item.data(), _docId: item.id })).sort((a, b) => a.category.localeCompare(b.category)));
    }, () => setSyncStatus("Budget sync failed"));
    const goalUnsub = watchUserCollection(user.uid, "goals", (snapshot) => {
      setGoalItems(snapshot.docs.map((item) => ({ ...item.data(), _docId: item.id })).sort((a, b) => a.deadline.localeCompare(b.deadline)));
    }, () => setSyncStatus("Goal sync failed"));

    return () => {
      subscriptionsUnsub();
      calendarUnsub();
      cardsUnsub();
      worthUnsub();
      trendUnsub();
      budgetUnsub();
      goalUnsub();
    };
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
    const assets = worthItems.filter((i) => i.type === "asset").reduce((sum, item) => sum + item.amount, 0);
    const debt = worthItems.filter((i) => i.type === "debt").reduce((sum, item) => sum + item.amount, 0);
    const upcoming = [...calendarItems, ...subscriptionItems.map((item) => ({ amount: item.cost, date: item.renews }))]
      .filter((item) => item.date >= new Date().toISOString().slice(0, 10))
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    return { income, expense, saved: income - expense, categoryTotals, netWorth: assets - debt, debt, upcoming };
  }, [calendarItems, subscriptionItems, transactions, worthItems]);

  const bestCard = useMemo(() => {
    return cardItems.find((card) => card.rewards.includes(spendCategory)) || cardItems[0];
  }, [cardItems, spendCategory]);

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

  async function addCloudItem(collectionName, item, reset) {
    if (!user) {
      setSyncStatus("Sign in to save this section");
      return;
    }
    const next = { ...item, id: Date.now() };
    setSyncStatus(`Saving ${collectionName}`);
    await saveUserDocument(user.uid, collectionName, next);
    setSyncStatus("Synced with Firestore");
    reset();
  }

  async function deleteItem(collectionName, id) {
    if (!user) {
      setSyncStatus("Sign in to delete cloud data");
      return;
    }
    setSyncStatus(`Deleting from ${collectionName}`);
    await deleteUserDocument(user.uid, collectionName, id);
    setSyncStatus("Synced with Firestore");
  }

  async function clearTransactions() {
    if (!user) {
      setSyncStatus("Sign in to clear Firestore data");
      return;
    }
    const ok = window.confirm("Clear all Firestore transactions for this account?");
    if (!ok) return;
    setSyncStatus("Clearing transactions");
    await clearUserCollection(user.uid, "transactions");
    setSyncStatus("Cloud transactions cleared");
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
          {active === "dashboard" && (
            <>
              <section className="panel wide featured-panel">
                <PanelTitle title="Spending Mirror" action={<PanelActions label={`${filtered.length} entries`} danger={user && filtered.length > 0 ? "Clear all" : ""} onDanger={clearTransactions} />} />
                <CategoryBars totals={metrics.categoryTotals} />
              </section>
              <section className="panel">
                <PanelTitle title="Smart Insights" action="Live" />
                <InsightPanel metrics={metrics} budgets={budgetItems} goals={goalItems} />
              </section>
              <section className="panel wide">
                <PanelTitle title="Recent Activity" action={formatInr(metrics.expense)} />
                <TransactionsTable items={filtered.slice(0, 6)} onDelete={(id) => deleteItem("transactions", id)} canDelete={Boolean(user)} />
              </section>
              <section className="panel">
                <PanelTitle title="Add Transaction" action={<Plus size={17} />} />
                <TransactionForm draft={draft} setDraft={setDraft} onAdd={() => addTransaction(draft)} />
              </section>
            </>
          )}

          {active === "transactions" && (
            <>
              <section className="panel wide">
                <PanelTitle title="Spending Mirror" action={<PanelActions label={`${filtered.length} entries`} danger={user && filtered.length > 0 ? "Clear all" : ""} onDanger={clearTransactions} />} />
                <CategoryBars totals={metrics.categoryTotals} />
              </section>
              <section className="panel">
                <PanelTitle title="Add Transaction" action={<Plus size={17} />} />
                <TransactionForm draft={draft} setDraft={setDraft} onAdd={() => addTransaction(draft)} />
              </section>
              <section className="panel wide">
                <PanelTitle title="Recent Activity" action={formatInr(metrics.expense)} />
                <TransactionsTable items={filtered} onDelete={(id) => deleteItem("transactions", id)} canDelete={Boolean(user)} />
              </section>
            </>
          )}

          {active === "transactions" && (
            <>
              <section className="panel wide">
                <PanelTitle title="Budget Health" action="Limits" />
                <BudgetPanel budgets={budgetItems} totals={metrics.categoryTotals} onDelete={(id) => deleteItem("budgets", id)} canDelete={Boolean(user)} />
                <BudgetForm
                  draft={budgetDraft}
                  setDraft={setBudgetDraft}
                  onAdd={() => addCloudItem("budgets", { ...budgetDraft, limit: Number(budgetDraft.limit) }, () => setBudgetDraft({ category: "Food", limit: "" }))}
                  disabled={!user}
                />
              </section>
              <section className="panel wide">
                <PanelTitle title="Smart Insights" action="Live" />
                <InsightPanel metrics={metrics} budgets={budgetItems} goals={goalItems} />
              </section>
            </>
          )}

          {active === "calendar" && (
            <section className="panel">
              <PanelTitle title="Money Calendar" action="Upcoming" />
              <EventList events={calendarItems} />
              <CalendarForm
                draft={eventDraft}
                setDraft={setEventDraft}
                onAdd={() => addCloudItem("calendarEvents", { ...eventDraft, amount: Number(eventDraft.amount) }, () => setEventDraft({ title: "", amount: "", date: new Date().toISOString().slice(0, 10), kind: "Bill" }))}
                disabled={!user}
              />
            </section>
          )}

          {active === "parser" && (
            <section className="panel">
              <PanelTitle title="SMS Expense Parser" action="Paste" />
              <SmsParser sms={sms} setSms={setSms} parsed={parsedSms} onImport={() => addTransaction(parsedSms)} />
            </section>
          )}

          {active === "cards" && (
            <section className="panel wide">
              <PanelTitle title="Credit Card Optimizer" action={bestCard?.name || "No cards"} />
              <CardOptimizer spendCategory={spendCategory} setSpendCategory={setSpendCategory} bestCard={bestCard} cards={cardItems} />
              <CardForm
                draft={cardDraft}
                setDraft={setCardDraft}
                onAdd={() => addCloudItem("creditCards", { ...cardDraft, limit: Number(cardDraft.limit), outstanding: Number(cardDraft.outstanding), rewards: cardDraft.rewards.split(",").map((item) => item.trim()).filter(Boolean) }, () => setCardDraft({ name: "", due: new Date().toISOString().slice(0, 10), limit: "", outstanding: "", rewards: "Food, Shopping", bestFor: "" }))}
                disabled={!user}
              />
            </section>
          )}

          {active === "networth" && (
            <section className="panel wide">
              <PanelTitle title="Personal Net Worth" action={formatInr(metrics.netWorth)} />
              <NetWorth items={worthItems} trend={worthTrend} />
              <WorthForm
                draft={worthDraft}
                setDraft={setWorthDraft}
                onAdd={() => addCloudItem("netWorthItems", { ...worthDraft, amount: Number(worthDraft.amount) }, () => setWorthDraft({ name: "", type: "asset", amount: "" }))}
                disabled={!user}
              />
            </section>
          )}

          {active === "calendar" && (
            <section className="panel">
              <PanelTitle title="Subscriptions" action={formatInr(subscriptionItems.reduce((s, i) => s + i.cost, 0))} />
              <SubscriptionList items={subscriptionItems} />
              <SubscriptionForm
                draft={subscriptionDraft}
                setDraft={setSubscriptionDraft}
                onAdd={() => addCloudItem("subscriptions", { ...subscriptionDraft, cost: Number(subscriptionDraft.cost) }, () => setSubscriptionDraft({ name: "", cost: "", cycle: "Monthly", renews: new Date().toISOString().slice(0, 10), category: "Entertainment" }))}
                disabled={!user}
              />
            </section>
          )}
          {active === "networth" && (
            <section className="panel">
              <PanelTitle title="Goals" action={<Target size={17} />} />
              <GoalPanel goals={goalItems} onDelete={(id) => deleteItem("goals", id)} canDelete={Boolean(user)} />
              <GoalForm
                draft={goalDraft}
                setDraft={setGoalDraft}
                onAdd={() => addCloudItem("goals", { ...goalDraft, target: Number(goalDraft.target), current: Number(goalDraft.current) }, () => setGoalDraft({ name: "", target: "", current: "", deadline: new Date().toISOString().slice(0, 10) }))}
                disabled={!user}
              />
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

function PanelActions({ label, danger, onDanger }) {
  return (
    <div className="panel-actions">
      <span>{label}</span>
      {danger && <button className="text-danger" onClick={onDanger}>{danger}</button>}
    </div>
  );
}

function CategoryBars({ totals }) {
  const rows = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...rows.map(([, value]) => value), 1);
  if (rows.length === 0) {
    return <EmptyState title="No spending yet" detail="Add a transaction to see category patterns." />;
  }
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

function TransactionsTable({ items, onDelete, canDelete }) {
  if (items.length === 0) {
    return (
      <div className="empty-state">
        <strong>No transactions yet</strong>
        <span>Add your first entry or import a bank SMS to create Firestore records.</span>
      </div>
    );
  }

  return (
    <div className="table">
      {items.slice(0, 10).map((item) => (
        <div className="table-row" key={item.id}>
          <div><strong>{item.merchant}</strong><span>{formatDate(item.date)} · {item.category} · {item.method}</span></div>
          <div className="row-actions">
            <b className={item.type}>{item.type === "income" ? "+" : "-"}{formatInr(item.amount)}</b>
            {canDelete && <button className="icon-danger" onClick={() => onDelete(item._docId || item.id)} title="Delete transaction"><Trash2 size={14} /></button>}
          </div>
        </div>
      ))}
    </div>
  );
}

function BudgetPanel({ budgets: budgetRows, totals, onDelete, canDelete }) {
  if (budgetRows.length === 0) {
    return <EmptyState title="No budgets yet" detail="Set category limits to track overspending." />;
  }

  return (
    <div className="bars">
      {budgetRows.map((budget) => {
        const spent = totals[budget.category] || 0;
        const progress = budget.limit ? Math.min(100, (spent / budget.limit) * 100) : 0;
        const over = spent > budget.limit;
        return (
          <div className="bar-row" key={budget.id}>
            <div>
              <strong>{budget.category}</strong>
              <span>{formatInr(spent)} / {formatInr(budget.limit)}</span>
            </div>
            <div className={`track ${over ? "over" : ""}`}><i style={{ width: `${Math.max(4, progress)}%` }} /></div>
            <div className="budget-footer">
              <span>{over ? `${formatInr(spent - budget.limit)} over` : `${formatInr(budget.limit - spent)} left`}</span>
              {canDelete && <button className="icon-danger" onClick={() => onDelete(budget._docId || budget.id)} title="Delete budget"><Trash2 size={14} /></button>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InsightPanel({ metrics, budgets: budgetRows, goals: goalRows }) {
  const overBudget = budgetRows.filter((budget) => (metrics.categoryTotals[budget.category] || 0) > budget.limit);
  const savingRate = metrics.income ? Math.round((metrics.saved / metrics.income) * 100) : 0;
  const topCategory = Object.entries(metrics.categoryTotals).sort((a, b) => b[1] - a[1])[0];
  const nextGoal = goalRows.find((goal) => goal.target > goal.current);
  const insights = [
    topCategory ? `Top spend is ${topCategory[0]} at ${formatInr(topCategory[1])}.` : "No spending pattern yet.",
    metrics.income ? `Saving rate is ${savingRate}%.` : "Add income to calculate saving rate.",
    overBudget.length ? `${overBudget.length} budget ${overBudget.length === 1 ? "is" : "are"} over limit.` : "Budgets are currently inside limits.",
    nextGoal ? `${formatInr(nextGoal.target - nextGoal.current)} left for ${nextGoal.name}.` : "No active goal shortfall.",
    metrics.upcoming ? `${formatInr(metrics.upcoming)} upcoming from calendar and subscriptions.` : "No upcoming commitments recorded.",
  ];

  return (
    <div className="insights">
      {insights.map((item) => <div className="insight" key={item}>{item}</div>)}
    </div>
  );
}

function GoalPanel({ goals: goalRows, onDelete, canDelete }) {
  if (goalRows.length === 0) {
    return <EmptyState title="No goals yet" detail="Create targets for emergency fund, gadgets, travel, or investments." />;
  }

  return (
    <div className="bars">
      {goalRows.map((goal) => {
        const progress = goal.target ? Math.min(100, (goal.current / goal.target) * 100) : 0;
        return (
          <div className="bar-row" key={goal.id}>
            <div>
              <strong>{goal.name}</strong>
              <span>{formatInr(goal.current)} / {formatInr(goal.target)}</span>
            </div>
            <div className="track goal"><i style={{ width: `${Math.max(4, progress)}%` }} /></div>
            <div className="budget-footer">
              <span>Due {formatDate(goal.deadline)}</span>
              {canDelete && <button className="icon-danger" onClick={() => onDelete(goal._docId || goal.id)} title="Delete goal"><Trash2 size={14} /></button>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EventList({ events }) {
  if (events.length === 0) {
    return <EmptyState title="No calendar events" detail="Add dues, renewals, or money reminders to Firestore." />;
  }

  return (
    <div className="list">
      {events.map((event) => (
        <div className="list-item" key={`${event.date}-${event.title}`}>
          <time>{formatDate(event.date)}</time>
          <div><strong>{event.title}</strong><span>{event.kind}</span></div>
          <b>{formatInr(event.amount)}</b>
        </div>
      ))}
    </div>
  );
}

function SubscriptionList({ items }) {
  if (items.length === 0) {
    return <EmptyState title="No subscriptions" detail="Add recurring payments to track renewals." />;
  }

  return (
    <div className="list">
      {items.map((item) => (
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

function CardOptimizer({ spendCategory, setSpendCategory, bestCard, cards }) {
  if (cards.length === 0) {
    return <EmptyState title="No credit cards" detail="Add your cards to get optimizer recommendations." />;
  }

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
        {cards.map((card) => (
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

function NetWorth({ items, trend }) {
  if (items.length === 0 && trend.length === 0) {
    return <EmptyState title="No net worth records" detail="Add assets and debts to calculate your current net worth." />;
  }

  const max = Math.max(...trend.map((i) => i.value), 1);
  return (
    <div className="networth">
      <div className="spark-chart">
        {trend.length === 0 ? <EmptyState title="No trend yet" detail="Trend points can be added from Firestore." /> : trend.map((item) => (
          <div key={item.label}>
            <i style={{ height: `${(item.value / max) * 100}%` }} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      <div className="list compact">
        {items.map((item) => (
          <div className="list-item" key={item.name}>
            <div><strong>{item.name}</strong><span>{item.type}</span></div>
            <b>{formatInr(item.amount)}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ title, detail }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <span>{detail}</span>
    </div>
  );
}

function SubscriptionForm({ draft, setDraft, onAdd, disabled }) {
  const update = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  return (
    <div className="mini-form">
      <input value={draft.name} onChange={(e) => update("name", e.target.value)} placeholder="Subscription name" />
      <input value={draft.cost} onChange={(e) => update("cost", e.target.value)} inputMode="numeric" placeholder="Cost" />
      <div className="two">
        <input type="date" value={draft.renews} onChange={(e) => update("renews", e.target.value)} />
        <input value={draft.category} onChange={(e) => update("category", e.target.value)} placeholder="Category" />
      </div>
      <button className="primary" disabled={disabled || !draft.name || !Number(draft.cost)} onClick={onAdd}>Save subscription</button>
    </div>
  );
}

function CalendarForm({ draft, setDraft, onAdd, disabled }) {
  const update = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  return (
    <div className="mini-form">
      <input value={draft.title} onChange={(e) => update("title", e.target.value)} placeholder="Event title" />
      <div className="two">
        <input value={draft.amount} onChange={(e) => update("amount", e.target.value)} inputMode="numeric" placeholder="Amount" />
        <input value={draft.kind} onChange={(e) => update("kind", e.target.value)} placeholder="Kind" />
      </div>
      <input type="date" value={draft.date} onChange={(e) => update("date", e.target.value)} />
      <button className="primary" disabled={disabled || !draft.title || !Number(draft.amount)} onClick={onAdd}>Save event</button>
    </div>
  );
}

function CardForm({ draft, setDraft, onAdd, disabled }) {
  const update = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  return (
    <div className="mini-form">
      <input value={draft.name} onChange={(e) => update("name", e.target.value)} placeholder="Card name" />
      <div className="two">
        <input value={draft.limit} onChange={(e) => update("limit", e.target.value)} inputMode="numeric" placeholder="Limit" />
        <input value={draft.outstanding} onChange={(e) => update("outstanding", e.target.value)} inputMode="numeric" placeholder="Outstanding" />
      </div>
      <input value={draft.rewards} onChange={(e) => update("rewards", e.target.value)} placeholder="Rewards: Food, Shopping" />
      <div className="two">
        <input type="date" value={draft.due} onChange={(e) => update("due", e.target.value)} />
        <input value={draft.bestFor} onChange={(e) => update("bestFor", e.target.value)} placeholder="Best for" />
      </div>
      <button className="primary" disabled={disabled || !draft.name || !Number(draft.limit)} onClick={onAdd}>Save card</button>
    </div>
  );
}

function WorthForm({ draft, setDraft, onAdd, disabled }) {
  const update = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  return (
    <div className="mini-form">
      <input value={draft.name} onChange={(e) => update("name", e.target.value)} placeholder="Asset or debt name" />
      <div className="two">
        <select value={draft.type} onChange={(e) => update("type", e.target.value)}>
          <option value="asset">Asset</option>
          <option value="debt">Debt</option>
        </select>
        <input value={draft.amount} onChange={(e) => update("amount", e.target.value)} inputMode="numeric" placeholder="Amount" />
      </div>
      <button className="primary" disabled={disabled || !draft.name || !Number(draft.amount)} onClick={onAdd}>Save net worth item</button>
    </div>
  );
}

function BudgetForm({ draft, setDraft, onAdd, disabled }) {
  const update = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  return (
    <div className="mini-form">
      <div className="two">
        <select value={draft.category} onChange={(e) => update("category", e.target.value)}>
          {categories.filter((item) => item !== "Salary").map((item) => <option key={item}>{item}</option>)}
        </select>
        <input value={draft.limit} onChange={(e) => update("limit", e.target.value)} inputMode="numeric" placeholder="Monthly limit" />
      </div>
      <button className="primary" disabled={disabled || !Number(draft.limit)} onClick={onAdd}>Save budget</button>
    </div>
  );
}

function GoalForm({ draft, setDraft, onAdd, disabled }) {
  const update = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  return (
    <div className="mini-form">
      <input value={draft.name} onChange={(e) => update("name", e.target.value)} placeholder="Goal name" />
      <div className="two">
        <input value={draft.target} onChange={(e) => update("target", e.target.value)} inputMode="numeric" placeholder="Target" />
        <input value={draft.current} onChange={(e) => update("current", e.target.value)} inputMode="numeric" placeholder="Current" />
      </div>
      <input type="date" value={draft.deadline} onChange={(e) => update("deadline", e.target.value)} />
      <button className="primary" disabled={disabled || !draft.name || !Number(draft.target)} onClick={onAdd}>Save goal</button>
    </div>
  );
}

export default App;
