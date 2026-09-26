(() => {
  const t = new Date(); const iso = d => d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  const y = new Date(t); y.setDate(t.getDate()-1);
  const fake = async () => ({ text: "hi" });
  fake.limits = async () => ({ maxPromptBytes: 65536, images: { maxCount: 5, maxInputBytes: 1e7, mediaTypes: ["image/png"] } });
  fake.json = async () => ({ store: "Trader Joe's", purchase_date: iso(y), items: [
    { raw_text: "BANANAS", name: "bananas", quantity: 3, unit: "", price: 0.87, category: "produce", location: "pantry", shelf_life_days: 6, is_food: true },
    { raw_text: "ORG BNLS CHKN BRST", name: "chicken breast", quantity: 1.4, unit: "lb", price: 8.12, category: "meat", location: "fridge", shelf_life_days: 2, is_food: true },
    { raw_text: "PAPER TOWELS", name: "paper towels", quantity: 1, unit: "", price: 7.99, category: "household", location: "pantry", shelf_life_days: 0, is_food: false },
    { raw_text: "BANANAS", name: "Banana", quantity: 2, unit: "", price: 0.58, category: "produce", location: "pantry", shelf_life_days: 5, is_food: true },
    { raw_text: "GRND COFFEE", name: "coffee beans", quantity: 1, unit: "bag", price: 9.49, category: "beverages", location: "pantry", shelf_life_days: 0, is_food: true } ] });
  window.claude = { use: async (n) => n === "sample" ? fake : null };
})();
