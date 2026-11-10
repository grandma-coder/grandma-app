import Foundation

// Mirror of lib/widgets/types.ts — keep the field names identical.

let appGroup = "group.co.sauceroom.grandma"
let snapshotKey = "widgetSnapshot"
let supportedVersion = 1

struct WDay: Decodable {
  let date: String
  let title: String
  let subtitle: String
  let progress: Double?
  let strip: WStrip?
  let hero: WHero?
}

struct WHero: Decodable {
  let eyebrow: String
  let big: String
  let unit: String
  let caption: String
  let footer: String
  let live: Bool?
}

struct WStrip: Decodable {
  let today: Int
  let length: Int
  let phases: [String]
}

struct WStat: Decodable {
  let label: String
  let value: String
  let daily: Bool
}

struct WSeries: Decodable {
  let label: String
  let kind: String
  let values: [Double]
  let summary: String?
  let scaleMax: Double?
}

struct WButton: Decodable {
  let type: String?
  let label: String
  let sticker: String?
  let url: String
}

struct WSince: Decodable {
  let label: String
  let at: String
}

struct WEntry: Decodable {
  let key: String
  let journey: String
  let name: String
  let state: String
  let emptyText: String?
  let days: [WDay]
  let todayFor: String
  let sinceLast: WSince?
  let stats: [WStat]
  let series: WSeries?
  let buttons: [WButton]
  let choices: [WButton]?
  let progressEnds: [String]?
  let openUrl: String
  let image: String?
}

struct WStrings: Decodable {
  let signIn: String
  let pickChild: String
  let refresh: String
  let start: [String: String]
  let phases: [String: String]?
  let styles: [String: String]?
}

struct Snapshot: Decodable {
  let version: Int
  let signedIn: Bool
  let generatedAt: String
  let activeKey: String?
  let entries: [WEntry]
  let lang: String?
  let strings: WStrings

  enum Loaded {
    case missing
    case outdated
    case ok(Snapshot)
  }

  static func load() -> Loaded {
    guard let json = UserDefaults(suiteName: appGroup)?.string(forKey: snapshotKey),
          let data = json.data(using: .utf8) else { return .missing }
    // Peek at the version first so a newer app's snapshot reads as "outdated", not "missing".
    struct VersionOnly: Decodable { let version: Int }
    guard let v = try? JSONDecoder().decode(VersionOnly.self, from: data) else { return .missing }
    if v.version != supportedVersion { return .outdated }
    guard let s = try? JSONDecoder().decode(Snapshot.self, from: data) else { return .outdated }
    return .ok(s)
  }

  static var entriesForPicker: [WEntry] {
    if case .ok(let s) = load(), s.signedIn { return s.entries }
    return []
  }

  static var current: Snapshot? {
    if case .ok(let s) = load(), s.signedIn { return s }
    return nil
  }
}

// ─── Day helpers (mirror of lib/widgets/day.ts) ────────────────────────────

func isoDay(_ date: Date) -> String {
  let f = DateFormatter()
  f.calendar = Calendar(identifier: .gregorian)
  f.locale = Locale(identifier: "en_US_POSIX")
  f.timeZone = .current
  f.dateFormat = "yyyy-MM-dd"
  return f.string(from: date)
}

func daysBetween(_ a: String, _ b: String) -> Int {
  let f = DateFormatter()
  f.locale = Locale(identifier: "en_US_POSIX")
  f.timeZone = TimeZone(identifier: "UTC")
  f.dateFormat = "yyyy-MM-dd"
  guard let da = f.date(from: a), let db = f.date(from: b) else { return 0 }
  return Int((db.timeIntervalSince(da) / 86400).rounded())
}

extension WEntry {
  /// The buttons to draw: the person's picks from "Edit Widget" (by log type), else the defaults.
  func buttons(picked: [String?]) -> [WButton] {
    (0..<buttons.count).map { i in
      if i < picked.count, let type = picked[i], let hit = choices?.first(where: { $0.type == type }) { return hit }
      return buttons[i]
    }
  }

  func day(for today: String) -> WDay? {
    guard let first = days.first, let last = days.last else { return nil }
    if let hit = days.first(where: { $0.date == today }) { return hit }
    // Before the range: first day. After it: nil, so the widget asks for a refresh instead of freezing.
    return today < first.date ? first : (today > last.date ? nil : last)
  }

  func isStale(_ today: String) -> Bool { todayFor < today }

  func statValue(_ stat: WStat, today: String) -> String {
    stat.daily && isStale(today) ? "0" : stat.value
  }

  func seriesValues(today: String) -> [Double] {
    guard let values = series?.values else { return [] }
    let late = max(0, min(values.count, daysBetween(todayFor, today)))
    return Array(values.dropFirst(late)) + Array(repeating: 0, count: late)
  }
}

func parseISODate(_ s: String) -> Date? {
  let f = ISO8601DateFormatter()
  f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
  if let d = f.date(from: s) { return d }
  f.formatOptions = [.withInternetDateTime]
  if let d = f.date(from: s) { return d }
  // No timezone (local time), e.g. "2026-11-09T08:00:00".
  let l = DateFormatter()
  l.locale = Locale(identifier: "en_US_POSIX")
  l.timeZone = .current
  l.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
  return l.date(from: String(s.prefix(19)))
}
