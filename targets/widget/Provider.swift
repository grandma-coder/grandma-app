import AppIntents
import WidgetKit

// ─── Configuration: which journey / child, which style, which log buttons ───

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

/// Card look. Names come from the snapshot so they follow the app language.
struct StyleEntity: AppEntity {
  static let typeDisplayRepresentation = TypeDisplayRepresentation(name: "Style")
  static let defaultQuery = StyleQuery()

  let id: String
  let name: String

  var displayRepresentation: DisplayRepresentation { DisplayRepresentation(title: "\(name)") }
}

struct StyleQuery: EntityQuery {
  static let ids = ["journey", "cream", "dark"]
  static let fallback = ["journey": "Journey color", "cream": "Cream", "dark": "Dark"]

  func entities(for identifiers: [String]) async throws -> [StyleEntity] {
    all().filter { identifiers.contains($0.id) }
  }

  func suggestedEntities() async throws -> [StyleEntity] { all() }

  private func all() -> [StyleEntity] {
    let names = Snapshot.current?.strings.styles ?? [:]
    return Self.ids.map { StyleEntity(id: $0, name: names[$0] ?? Self.fallback[$0] ?? $0) }
  }
}

/// A log the person can put on a button. id = log type ("feeding").
struct ButtonEntity: AppEntity {
  static let typeDisplayRepresentation = TypeDisplayRepresentation(name: "Log")
  static let defaultQuery = ButtonQuery()

  let id: String
  let name: String

  var displayRepresentation: DisplayRepresentation { DisplayRepresentation(title: "\(name)") }
}

struct ButtonQuery: EntityQuery {
  @IntentParameterDependency<SelectEntryIntent>(\.$entry)
  var config

  func entities(for identifiers: [String]) async throws -> [ButtonEntity] {
    // Any journey's choices, so a pick still resolves after the journey changes.
    var seen = Set<String>()
    var out: [ButtonEntity] = []
    for e in Snapshot.entriesForPicker {
      for c in e.choices ?? [] {
        if let type = c.type, identifiers.contains(type), !seen.contains(type) {
          seen.insert(type)
          out.append(ButtonEntity(id: type, name: c.label))
        }
      }
    }
    return out
  }

  func suggestedEntities() async throws -> [ButtonEntity] {
    guard let s = Snapshot.current else { return [] }
    let key = config?.entry.id ?? s.activeKey
    let entry = s.entries.first(where: { $0.key == key }) ?? s.entries.first
    return (entry?.choices ?? []).compactMap { c in c.type.map { ButtonEntity(id: $0, name: c.label) } }
  }
}

struct SelectEntryIntent: WidgetConfigurationIntent {
  static let title: LocalizedStringResource = "Choose what to show"
  static let description = IntentDescription("Pick a journey or a child, a style and your log buttons.")

  @Parameter(title: "Show")
  var entry: EntryEntity?

  @Parameter(title: "Style")
  var style: StyleEntity?

  @Parameter(title: "Button 1")
  var button1: ButtonEntity?

  @Parameter(title: "Button 2")
  var button2: ButtonEntity?

  @Parameter(title: "Button 3")
  var button3: ButtonEntity?

  @Parameter(title: "Button 4")
  var button4: ButtonEntity?

  var pickedButtons: [String?] { [button1?.id, button2?.id, button3?.id, button4?.id] }
}

// ─── Timeline ──────────────────────────────────────────────────────────────

enum WidgetState {
  case signedOut(String)
  case outdated(String)
  case pickChild(String)
  case start(String, String)
  case refresh(String, String)
  case ok(WEntry)
}

struct GrandmaEntry: TimelineEntry {
  let date: Date
  let state: WidgetState
  var style: String = "journey"
  var picked: [String?] = []
  var lang: String = "en"
  var phases: [String: String] = [:]
}

func resolveState(chosenKey: String?, at date: Date = .now) -> WidgetState {
  switch Snapshot.load() {
  case .missing:
    return .signedOut("Sign in to Grandma")
  case .outdated:
    return .outdated("Open Grandma to refresh")
  case .ok(let s):
    guard s.signedIn else { return .signedOut(s.strings.signIn) }
    let key = chosenKey ?? s.activeKey
    if let key, let entry = s.entries.first(where: { $0.key == key }) { return okOrRefresh(entry, s, date) }
    if let key, key.hasPrefix("kids:") { return .pickChild(s.strings.pickChild) }
    if let key, let text = s.strings.start[key] { return .start(text, "grandma-app://log/\(key)/home") }
    if let first = s.entries.first { return okOrRefresh(first, s, date) }
    return .start(s.strings.start["cycle"] ?? "Open Grandma", "grandma-app://")
  }
}

/** Past the snapshot's precomputed days (app not opened for a week): ask for a refresh, never freeze. */
func okOrRefresh(_ entry: WEntry, _ s: Snapshot, _ date: Date) -> WidgetState {
  if !entry.days.isEmpty && entry.day(for: isoDay(date)) == nil { return .refresh(s.strings.refresh, entry.openUrl) }
  return .ok(entry)
}

func makeEntry(_ configuration: SelectEntryIntent, at date: Date) -> GrandmaEntry {
  let s = Snapshot.current
  return GrandmaEntry(
    date: date,
    state: resolveState(chosenKey: configuration.entry?.id, at: date),
    style: configuration.style?.id ?? "journey",
    picked: configuration.pickedButtons,
    lang: s?.lang ?? "en",
    phases: s?.strings.phases ?? [:]
  )
}

struct Provider: AppIntentTimelineProvider {
  func placeholder(in context: Context) -> GrandmaEntry {
    GrandmaEntry(date: .now, state: .signedOut("Grandma"))
  }

  func snapshot(for configuration: SelectEntryIntent, in context: Context) async -> GrandmaEntry {
    makeEntry(configuration, at: .now)
  }

  func timeline(for configuration: SelectEntryIntent, in context: Context) async -> Timeline<GrandmaEntry> {
    // Now, hourly for a day (the kids "2h since last feed" hero), then every midnight for a week —
    // the snapshot already holds each day's lines.
    var dates: [Date] = [.now]
    let cal = Calendar.current
    for h in 1...24 { dates.append(Date.now.addingTimeInterval(Double(h) * 3600)) }
    var next = cal.startOfDay(for: .now)
    for _ in 0..<7 {
      next = cal.date(byAdding: .day, value: 1, to: next) ?? next.addingTimeInterval(86400)
      dates.append(next.addingTimeInterval(1))
    }
    dates.sort()
    return Timeline(entries: dates.map { makeEntry(configuration, at: $0) }, policy: .atEnd)
  }
}
