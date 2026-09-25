import SwiftUI
import SwiftData

struct ShoppingListView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: \ShoppingItem.addedAt) private var items: [ShoppingItem]
    @State private var newItem = ""
    @FocusState private var addFieldFocused: Bool

    private var toBuy: [ShoppingItem] { items.filter { !$0.isChecked } }
    private var inCart: [ShoppingItem] { items.filter(\.isChecked) }

    private var shareText: String {
        toBuy.map { item in
            let qty = item.displayQuantity
            return "• " + item.name + (qty.isEmpty ? "" : " (\(qty))")
        }.joined(separator: "\n")
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    HStack {
                        Image(systemName: "plus.circle.fill").foregroundStyle(Color.accentColor)
                        TextField("Add item", text: $newItem)
                            .focused($addFieldFocused)
                            .submitLabel(.done)
                            .onSubmit(addItem)
                    }
                }

                if !toBuy.isEmpty {
                    Section("To buy") {
                        ForEach(toBuy) { row($0) }
                    }
                }
                if !inCart.isEmpty {
                    Section("In cart") {
                        ForEach(inCart) { row($0) }
                    }
                }
            }
            .overlay {
                if items.isEmpty {
                    ContentUnavailableView(
                        "Nothing to buy",
                        systemImage: "cart",
                        description: Text("Add items here, from a recipe's missing ingredients, or from your meal plan.")
                    )
                    .allowsHitTesting(false)
                }
            }
            .navigationTitle("Shopping")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    if !toBuy.isEmpty {
                        ShareLink(item: shareText) { Image(systemName: "square.and.arrow.up") }
                    }
                }
                ToolbarItem(placement: .primaryAction) {
                    Menu {
                        Button { moveCheckedToFridge() } label: {
                            Label("Put checked items away", systemImage: "refrigerator")
                        }
                        .disabled(inCart.isEmpty)
                        Button(role: .destructive) { for item in inCart { context.delete(item) } } label: {
                            Label("Clear checked", systemImage: "trash")
                        }
                        .disabled(inCart.isEmpty)
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
        }
    }

    private func row(_ item: ShoppingItem) -> some View {
        Button {
            withAnimation { item.isChecked.toggle() }
        } label: {
            HStack {
                Image(systemName: item.isChecked ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(item.isChecked ? Color.accentColor : Color.secondary)
                VStack(alignment: .leading, spacing: 2) {
                    Text(item.name)
                        .strikethrough(item.isChecked)
                        .foregroundStyle(item.isChecked ? Color.secondary : Color.primary)
                    if !item.reason.isEmpty {
                        Text(item.reason).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                    }
                }
                Spacer()
                Text(item.displayQuantity).foregroundStyle(.secondary)
            }
        }
        .swipeActions {
            Button(role: .destructive) { context.delete(item) } label: {
                Label("Delete", systemImage: "trash")
            }
        }
    }

    private func addItem() {
        let name = newItem.trimmingCharacters(in: .whitespaces)
        guard !name.isEmpty else { return }
        context.insert(ShoppingItem(name: name))
        newItem = ""
        addFieldFocused = true
    }

    /// Bought items become pantry items; set expiry dates afterwards in the Fridge tab.
    private func moveCheckedToFridge() {
        for item in inCart {
            context.insert(PantryItem(name: item.name, quantity: item.quantity == 0 ? 1 : item.quantity, unit: item.unit))
            context.delete(item)
        }
    }
}
