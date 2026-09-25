import SwiftUI
import SwiftData

struct SettingsView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss

    @AppStorage(SettingsKey.remindersEnabled) private var remindersEnabled = SettingsDefault.remindersEnabled
    @AppStorage(SettingsKey.reminderLeadDays) private var leadDays = SettingsDefault.reminderLeadDays
    @AppStorage(SettingsKey.reminderHour) private var reminderHour = SettingsDefault.reminderHour
    @AppStorage(SettingsKey.soonThresholdDays) private var soonDays = SettingsDefault.soonThresholdDays
    @AppStorage(SettingsKey.staples) private var staples = SettingsDefault.staples
    @AppStorage(SettingsKey.claudeModel) private var model = SettingsDefault.claudeModel

    @State private var apiKey = KeychainStore.read(KeychainStore.anthropicAccount) ?? ""
    @State private var keySaved = KeychainStore.read(KeychainStore.anthropicAccount) != nil
    @State private var message: String?

    private var iCloudAvailable: Bool { FileManager.default.ubiquityIdentityToken != nil }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    SecureField("sk-ant-…", text: $apiKey)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    HStack {
                        Button(keySaved ? "Update key" : "Save key") {
                            KeychainStore.write(apiKey.trimmingCharacters(in: .whitespacesAndNewlines), account: KeychainStore.anthropicAccount)
                            keySaved = !apiKey.isEmpty
                            message = keySaved ? "API key saved on this device." : nil
                        }
                        .disabled(apiKey.trimmingCharacters(in: .whitespaces).isEmpty)
                        if keySaved {
                            Spacer()
                            Button("Remove", role: .destructive) {
                                KeychainStore.delete(KeychainStore.anthropicAccount)
                                apiKey = ""
                                keySaved = false
                            }
                        }
                    }
                    .buttonStyle(.borderless)
                    Link("Get an API key", destination: URL(string: "https://console.anthropic.com/settings/keys")!)
                } header: {
                    Text("Claude (AI chef & scanning)")
                } footer: {
                    Text("Stored in this device's Keychain. Photos, your inventory, and chat messages are sent to Anthropic's API when you use AI features; usage is billed to this key.")
                }

                Section("Expiration reminders") {
                    Toggle("Remind me before food expires", isOn: $remindersEnabled)
                        .onChange(of: remindersEnabled) { _, enabled in
                            if enabled { Task { _ = await ExpiryNotifier.requestAuthorization() } }
                        }
                    if remindersEnabled {
                        Stepper(leadDays == 0 ? "On the day it expires" : "\(leadDays) day\(leadDays == 1 ? "" : "s") before", value: $leadDays, in: 0...7)
                        Stepper("At \(hourLabel)", value: $reminderHour, in: 5...21)
                    }
                    Stepper("\"Expiring soon\" = within \(soonDays) days", value: $soonDays, in: 1...14)
                }

                Section {
                    TextField("Staples", text: $staples, axis: .vertical)
                        .textInputAutocapitalization(.never)
                } header: {
                    Text("Always in stock")
                } footer: {
                    Text("Comma-separated. These never count as missing when matching recipes.")
                }

                Section("Data") {
                    LabeledContent("iCloud sync", value: iCloudAvailable ? "On" : "Not signed in")
                    Button("Add sample recipes") {
                        let added = (try? SampleData.importRecipes(into: context)) ?? 0
                        message = added == 0 ? "Sample recipes are already added." : "Added \(added) recipes."
                    }
                }

                Section("Advanced") {
                    TextField("Claude model", text: $model)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .font(.body.monospaced())
                    Button("Reset to default model") { model = SettingsDefault.claudeModel }
                        .disabled(model == SettingsDefault.claudeModel)
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } }
            }
            .alert(message ?? "", isPresented: Binding(get: { message != nil }, set: { if !$0 { message = nil } })) {
                Button("OK") {}
            }
            .task {
                if remindersEnabled { _ = await ExpiryNotifier.requestAuthorization() }
            }
        }
    }

    private var hourLabel: String {
        let date = Calendar.current.date(bySettingHour: reminderHour, minute: 0, second: 0, of: .now) ?? .now
        return date.formatted(date: .omitted, time: .shortened)
    }
}
