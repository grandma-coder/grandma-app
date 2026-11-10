import AppIntents
import WidgetKit

// ─── Configuration: which journey / child this widget shows ────────────────

struct EntryEntity: AppEntity {
  static let typeDisplayRepresentation = TypeDisplayRepresentation(name: "Journey")
  static let defaultQuery = EntryQuery()

  let id: String
  let name: String

  var displayRepresentation: DisplayRepresentation { DisplayRepresentation(title: "\(name)") }
}

struct EntryQuery: EntityQuery {
  func entities(for identifiers: [String]) async throws -> [EntryEntity] {
    all().filter { identifiers.contains($0.id) }
  }

  func suggestedEntities() async throws -> [EntryEntity] { all() }

  private func all() -> [EntryEntity] {
    Snapshot.entriesForPicker.map { EntryEntity(id: $0.key, name: $0.name) }
  }
}

struct SelectEntryIntent: WidgetConfigurationIntent {
  static let title: LocalizedStringResource = "Choose what to show"
  static let description = IntentDescription("Pick a journey or a child.")

  @Parameter(title: "Show")
  var entry: EntryEntity?
}

// ─── Timeline ──────────────────────────────────────────────────────────────

enum WidgetState {
  case signedOut(String)
  case outdated(String)
  case pickChild(String)
  case start(String)
  case ok(WEntry)
}

struct GrandmaEntry: TimelineEntry {
  let date: Date
  let state: WidgetState
}

func resolveState(chosenKey: String?) -> WidgetState {
  switch Snapshot.load() {
  case .missing:
    return .signedOut("Sign in to Grandma")
  case .outdated:
    return .outdated("Open Grandma to refresh")
  case .ok(let s):
    guard s.signedIn else { return .signedOut(s.strings.signIn) }
    let key = chosenKey ?? s.activeKey
    if let key, let entry = s.entries.first(where: { $0.key == key }) { return .ok(entry) }
    if let key, key.hasPrefix("kids:") { return .pickChild(s.strings.pickChild) }
    if let key, let text = s.strings.start[key] { return .start(text) }
    if let first = s.entries.first { return .ok(first) }
    return .start(s.strings.start["cycle"] ?? "Open Grandma")
  }
}

struct Provider: AppIntentTimelineProvider {
  func placeholder(in context: Context) -> GrandmaEntry {
    GrandmaEntry(date: .now, state: .signedOut("Grandma"))
  }

  func snapshot(for configuration: SelectEntryIntent, in context: Context) async -> GrandmaEntry {
    GrandmaEntry(date: .now, state: resolveState(chosenKey: configuration.entry?.id))
  }

  func timeline(for configuration: SelectEntryIntent, in context: Context) async -> Timeline<GrandmaEntry> {
    let state = resolveState(chosenKey: configuration.entry?.id)
    // Now, then every midnight for a week — the snapshot already holds each day's lines.
    var dates: [Date] = [.now]
    let cal = Calendar.current
    var next = cal.startOfDay(for: .now)
    for _ in 0..<7 {
      next = cal.date(byAdding: .day, value: 1, to: next) ?? next.addingTimeInterval(86400)
      dates.append(next.addingTimeInterval(1))
    }
    return Timeline(entries: dates.map { GrandmaEntry(date: $0, state: state) }, policy: .atEnd)
  }
}
