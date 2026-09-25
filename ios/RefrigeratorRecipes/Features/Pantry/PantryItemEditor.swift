import SwiftUI
import SwiftData

struct PantryItemEditor: View {
    struct Draft: Identifiable {
        let id = UUID()
        var name = ""
        var quantity = "1"
        var unit = ""
        var location: StorageLocation = .fridge
        var category = ""
        var hasExpiry = false
        var expiresAt = Calendar.current.date(byAdding: .day, value: 7, to: .now) ?? .now
        var barcode: String?
        var notes = ""

        init(location: StorageLocation = .fridge) {
            self.location = location
        }

        init(item: PantryItem) {
            name = item.name
            quantity = item.quantity.editableString
            unit = item.unit
            location = item.location
            category = item.category
            hasExpiry = item.expiresAt != nil
            expiresAt = item.expiresAt ?? expiresAt
            barcode = item.barcode
            notes = item.notes
        }
    }

    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @State var draft: Draft
    let item: PantryItem?

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Name", text: $draft.name)
                        .textInputAutocapitalization(.words)
                    HStack {
                        TextField("Qty", text: $draft.quantity)
                            .keyboardType(.decimalPad)
                            .frame(maxWidth: 80)
                        TextField("Unit (e.g. lbs, cups)", text: $draft.unit)
                            .textInputAutocapitalization(.never)
                    }
                    Picker("Stored in", selection: $draft.location) {
                        ForEach(StorageLocation.allCases) { Label($0.title, systemImage: $0.symbol).tag($0) }
                    }
                    TextField("Category (e.g. dairy, produce)", text: $draft.category)
                        .textInputAutocapitalization(.never)
                }

                Section("Expiration") {
                    Toggle("Has an expiration date", isOn: $draft.hasExpiry.animation())
                    if draft.hasExpiry {
                        DatePicker("Expires", selection: $draft.expiresAt, displayedComponents: .date)
                        HStack {
                            ForEach([3, 7, 14, 30], id: \.self) { days in
                                Button(days < 7 ? "\(days)d" : days < 30 ? "\(days / 7)w" : "1m") {
                                    draft.expiresAt = Calendar.current.date(byAdding: .day, value: days, to: .now) ?? .now
                                }
                                .buttonStyle(.bordered)
                            }
                        }
                    }
                }

                Section("Notes") {
                    TextField("Notes", text: $draft.notes, axis: .vertical)
                    if let barcode = draft.barcode {
                        LabeledContent("Barcode", value: barcode)
                    }
                }

                if let item {
                    Section {
                        Button("Delete item", role: .destructive) {
                            context.delete(item)
                            dismiss()
                        }
                    }
                }
            }
            .navigationTitle(item == nil ? "Add item" : "Edit item")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save", action: save)
                        .disabled(draft.name.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }

    private func save() {
        let target = item ?? PantryItem(name: "")
        target.name = draft.name.trimmingCharacters(in: .whitespaces)
        target.quantity = draft.quantity.doubleValue
        target.unit = draft.unit.trimmingCharacters(in: .whitespaces)
        target.location = draft.location
        target.category = draft.category.trimmingCharacters(in: .whitespaces)
        target.expiresAt = draft.hasExpiry ? draft.expiresAt : nil
        target.barcode = draft.barcode
        target.notes = draft.notes
        if item == nil { context.insert(target) }
        dismiss()
    }
}
