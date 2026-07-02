export const seedTransactions = [
  { id: 1, date: "2026-07-01", type: "income", category: "Salary", merchant: "Acme Tech", method: "HDFC Bank", amount: 85000, note: "Monthly salary" },
  { id: 2, date: "2026-07-01", type: "expense", category: "Rent", merchant: "Landlord", method: "UPI", amount: 22000, note: "Apartment rent" },
  { id: 3, date: "2026-07-02", type: "expense", category: "Food", merchant: "Zomato", method: "ICICI Coral", amount: 642, note: "Dinner" },
  { id: 4, date: "2026-07-02", type: "expense", category: "Transport", merchant: "Uber", method: "SBI Cashback", amount: 318, note: "Cab to office" },
  { id: 5, date: "2026-07-03", type: "expense", category: "Shopping", merchant: "Amazon", method: "Amazon Pay ICICI", amount: 3499, note: "Phone accessories" },
  { id: 6, date: "2026-07-04", type: "expense", category: "Investing", merchant: "Groww SIP", method: "HDFC Bank", amount: 12000, note: "Index fund SIP" },
  { id: 7, date: "2026-07-05", type: "expense", category: "Bills", merchant: "Airtel Fiber", method: "UPI", amount: 999, note: "Broadband" },
  { id: 8, date: "2026-07-07", type: "expense", category: "Music", merchant: "YouTube Premium", method: "SBI Cashback", amount: 149, note: "Family plan share" },
  { id: 9, date: "2026-07-09", type: "expense", category: "Food", merchant: "Third Wave Coffee", method: "UPI", amount: 276, note: "Coffee" },
  { id: 10, date: "2026-07-10", type: "expense", category: "Health", merchant: "Apollo Pharmacy", method: "HDFC Bank", amount: 780, note: "Medicines" },
];

export const subscriptions = [
  { name: "YouTube Premium", cost: 149, cycle: "Monthly", renews: "2026-07-07", category: "Music" },
  { name: "Netflix", cost: 499, cycle: "Monthly", renews: "2026-07-14", category: "Entertainment" },
  { name: "iCloud+", cost: 75, cycle: "Monthly", renews: "2026-07-19", category: "Cloud" },
  { name: "Gym", cost: 1800, cycle: "Monthly", renews: "2026-07-22", category: "Health" },
];

export const calendarEvents = [
  { date: "2026-07-04", title: "Groww SIP", amount: 12000, kind: "Investing" },
  { date: "2026-07-07", title: "YouTube Premium", amount: 149, kind: "Subscription" },
  { date: "2026-07-12", title: "SBI Cashback due", amount: 6310, kind: "Credit Card" },
  { date: "2026-07-14", title: "Netflix renewal", amount: 499, kind: "Subscription" },
  { date: "2026-07-22", title: "Gym renewal", amount: 1800, kind: "Subscription" },
  { date: "2026-07-28", title: "ICICI Coral due", amount: 12840, kind: "Credit Card" },
];

export const creditCards = [
  { name: "SBI Cashback", due: "2026-07-12", limit: 100000, outstanding: 6310, rewards: ["Online", "Food", "Transport"], bestFor: "online spending" },
  { name: "Amazon Pay ICICI", due: "2026-07-24", limit: 150000, outstanding: 3499, rewards: ["Shopping", "Bills"], bestFor: "Amazon and utility bills" },
  { name: "ICICI Coral", due: "2026-07-28", limit: 90000, outstanding: 12840, rewards: ["Fuel", "Dining", "Travel"], bestFor: "dining and fuel" },
];

export const netWorthItems = [
  { name: "Savings account", type: "asset", amount: 146500 },
  { name: "Mutual funds", type: "asset", amount: 322000 },
  { name: "Stocks", type: "asset", amount: 88500 },
  { name: "Emergency FD", type: "asset", amount: 100000 },
  { name: "Credit cards", type: "debt", amount: 22649 },
  { name: "Personal loan", type: "debt", amount: 64000 },
];

export const netWorthTrend = [
  { label: "Feb", value: 443000 },
  { label: "Mar", value: 466000 },
  { label: "Apr", value: 482000 },
  { label: "May", value: 501000 },
  { label: "Jun", value: 527000 },
  { label: "Jul", value: 570351 },
];

export const budgets = [
  { id: "food", category: "Food", limit: 9000 },
  { id: "transport", category: "Transport", limit: 4500 },
  { id: "shopping", category: "Shopping", limit: 8000 },
  { id: "bills", category: "Bills", limit: 6000 },
];

export const goals = [
  { id: "emergency", name: "Emergency fund", target: 300000, current: 100000, deadline: "2026-12-31" },
  { id: "phone", name: "Next phone upgrade", target: 85000, current: 18000, deadline: "2026-10-15" },
];
