import SwiftUI
import WidgetKit

// Site look (constants/theme.ts + the approved widget mockup): journey-tinted card, ink outline,
// Architects Daughter for the hand-lettered words, Hanken Grotesk for numbers and UI, sticker icons.
extension Color {
  init(hex: UInt32) {
    self.init(
      red: Double((hex >> 16) & 0xFF) / 255,
      green: Double((hex >> 8) & 0xFF) / 255,
      blue: Double(hex & 0xFF) / 255
    )
  }
  static let cream = Color(hex: 0xFBF6EA)
  static let ink = Color(hex: 0x161513)
  static let inkSoft = Color(hex: 0x4F4B43)
  static let inkMuted = Color(hex: 0x8C877C)
}

enum Typeface {
  static func hand(_ size: CGFloat) -> Font { .custom("ArchitectsDaughter-Regular", size: size) }
  static func medium(_ size: CGFloat) -> Font { .custom("HankenGrotesk-Medium", size: size) }
  static func bold(_ size: CGFloat) -> Font { .custom("HankenGrotesk-Bold", size: size) }
  static func heavy(_ size: CGFloat) -> Font { .custom("HankenGrotesk-ExtraBold", size: size) }
}

struct Accent {
  /// Card and tile fill.
  let bg: Color
  /// Bars, progress fill.
  let strong: Color
  /// Journey sticker in the corner.
  let icon: String

  static func of(_ journey: String) -> Accent {
    switch journey {
    case "cycle": return Accent(bg: Color(hex: 0xFADCE7), strong: Color(hex: 0xF3A8C3), icon: "st_flower")
    case "pregnancy": return Accent(bg: Color(hex: 0xE6DDF8), strong: Color(hex: 0xB9A5EF), icon: "st_heart")
    case "kids": return Accent(bg: Color(hex: 0xDCE7F8), strong: Color(hex: 0xA8C7F0), icon: "st_baby")
    default: return Accent(bg: Color(hex: 0xFCE2CF), strong: Color(hex: 0xF4B587), icon: "st_flame")
    }
  }
}

/// Log button sticker by log type (the last path component of the button URL).
func buttonSticker(_ url: String) -> String {
  let type = URL(string: url)?.lastPathComponent ?? ""
  switch type {
  case "period_start", "night_sweat": return "st_drop"
  case "symptom": return "st_headache"
  case "mood", "low_mood": return "st_face3"
  case "basal_temp": return "st_thermo"
  case "kick_count": return "st_foot"
  case "water": return "st_glass"
  case "feeding": return "st_bottle"
  case "sleep": return "st_moon"
  case "diaper": return "st_diaper"
  case "hot_flash": return "st_flame"
  default: return "st_face3"
  }
}

func moodSticker(_ score: Double) -> String {
  switch score {
  case ..<2.5: return "st_face1"
  case ..<3.5: return "st_face2"
  case ..<4.5: return "st_face3"
  default: return "st_face4"
  }
}

func phaseColor(_ code: String) -> Color {
  switch code {
  case "m": return Color(hex: 0xEC4B3C)
  case "f": return Color(hex: 0x9ED8B0)
  case "o": return Color(hex: 0xF9C846)
  default: return Color(hex: 0xB69CF2)
  }
}

/// "45m", "2h", "1d 18h" — the kids hero, recomputed on every timeline entry.
func compactSince(_ at: Date, now: Date) -> String {
  let minutes = max(0, Int(now.timeIntervalSince(at) / 60))
  if minutes < 60 { return "\(minutes)m" }
  let hours = minutes / 60
  if hours < 24 { return "\(hours)h" }
  return hours % 24 == 0 ? "\(hours / 24)d" : "\(hours / 24)d \(hours % 24)h"
}

struct Dashed: View {
  var body: some View {
    Line()
      .stroke(Color.ink.opacity(0.35), style: StrokeStyle(lineWidth: 1, dash: [3, 3]))
      .frame(height: 1)
  }
  struct Line: Shape {
    func path(in rect: CGRect) -> Path {
      var p = Path()
      p.move(to: CGPoint(x: 0, y: rect.midY))
      p.addLine(to: CGPoint(x: rect.maxX, y: rect.midY))
      return p
    }
  }
}

struct CardBackground: View {
  let fill: Color
  var body: some View {
    ZStack {
      fill
      ContainerRelativeShape().strokeBorder(Color.ink, lineWidth: 2.5)
    }
  }
}

struct WidgetView: View {
  let entry: GrandmaEntry
  @Environment(\.widgetFamily) var family

  var body: some View {
    switch entry.state {
    case .ok(let e):
      JourneyView(entry: e, today: isoDay(entry.date), now: entry.date, family: family)
        .containerBackground(for: .widget) { CardBackground(fill: Accent.of(e.journey).bg) }
    case .signedOut(let text), .outdated(let text):
      message(text, "grandma-app://")
    case .pickChild(let text):
      message(text, "grandma-app://log/kids/home")
    case .start(let text, let url), .refresh(let text, let url):
      message(text, url)
    }
  }

  func message(_ text: String, _ url: String) -> some View {
    MessageView(text: text, url: url)
      .containerBackground(for: .widget) { CardBackground(fill: Color.cream) }
  }
}

struct MessageView: View {
  let text: String
  let url: String
  var body: some View {
    VStack(spacing: 8) {
      Image("st_heart").resizable().scaledToFit().frame(width: 30, height: 30)
      Text(text)
        .font(Typeface.hand(17))
        .foregroundStyle(Color.ink)
        .multilineTextAlignment(.center)
        .minimumScaleFactor(0.7)
    }
    .padding()
    .widgetURL(URL(string: url))
  }
}

struct JourneyView: View {
  let entry: WEntry
  let today: String
  let now: Date
  let family: WidgetFamily

  var accent: Accent { Accent.of(entry.journey) }
  var day: WDay? { entry.day(for: today) }
  var small: Bool { family == .systemSmall }

  var body: some View {
    Group {
      switch family {
      case .systemMedium:
        HStack(alignment: .top, spacing: 12) {
          VStack(alignment: .leading, spacing: 0) {
            header
            Spacer(minLength: 4)
            footerBlock
          }
          buttonGrid.frame(width: 132)
        }
      case .systemLarge:
        VStack(alignment: .leading, spacing: 10) {
          header
          details
          Spacer(minLength: 0)
          buttonRow
        }
      default:
        VStack(alignment: .leading, spacing: 0) {
          header
          Spacer(minLength: 4)
          footerBlock
        }
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .widgetURL(URL(string: entry.openUrl))
  }

  // ─── Header: eyebrow, big number + unit, hand-lettered caption, corner sticker ──

  var cornerIcon: some View {
    Group {
      if let b64 = entry.image, let data = Data(base64Encoded: b64), let img = UIImage(data: data) {
        Image(uiImage: img).resizable().scaledToFit().frame(width: small ? 34 : 40, height: small ? 34 : 40)
      } else {
        Image(accent.icon).resizable().scaledToFit().frame(width: 26, height: 26)
      }
    }
  }

  var bigText: String {
    guard let hero = day?.hero else { return "" }
    if hero.live == true, let since = entry.sinceLast, let at = parseISODate(since.at) { return compactSince(at, now: now) }
    return hero.big
  }

  var header: some View {
    HStack(alignment: .top, spacing: 6) {
      VStack(alignment: .leading, spacing: 2) {
        if entry.state == "empty" {
          eyebrow(entry.name)
          Text(entry.emptyText ?? "")
            .font(Typeface.hand(small ? 15 : 17))
            .foregroundStyle(Color.ink)
            .lineLimit(4)
            .minimumScaleFactor(0.7)
            .padding(.top, 4)
        } else if let hero = day?.hero {
          eyebrow(hero.eyebrow)
          if !bigText.isEmpty {
            HStack(alignment: .firstTextBaseline, spacing: 4) {
              Text(bigText).font(Typeface.heavy(small ? 40 : 44)).foregroundStyle(Color.ink)
              if !hero.unit.isEmpty { Text(hero.unit).font(Typeface.bold(small ? 15 : 17)).foregroundStyle(Color.ink) }
            }
            .lineLimit(1)
            .minimumScaleFactor(0.5)
          }
          if !hero.caption.isEmpty {
            Text(hero.caption)
              .font(Typeface.hand(bigText.isEmpty ? 18 : 15))
              .foregroundStyle(Color.ink)
              .lineLimit(2)
              .minimumScaleFactor(0.7)
          }
        } else if let day {
          eyebrow(entry.name)
          Text(day.title).font(Typeface.hand(17)).foregroundStyle(Color.ink).lineLimit(2).minimumScaleFactor(0.7)
        }
      }
      Spacer(minLength: 0)
      cornerIcon
    }
  }

  func eyebrow(_ text: String) -> some View {
    Text(text.uppercased())
      .font(Typeface.hand(11))
      .foregroundStyle(Color.inkSoft)
      .lineLimit(small ? 2 : 1)
      .minimumScaleFactor(0.7)
  }

  @ViewBuilder var footerBlock: some View {
    if let footer = day?.hero?.footer, !footer.isEmpty {
      VStack(alignment: .leading, spacing: 6) {
        Dashed()
        Text(footer).font(Typeface.bold(12)).foregroundStyle(Color.ink).lineLimit(2).minimumScaleFactor(0.7)
      }
    }
  }

  // ─── Log buttons: sticker tiles ────────────────────────────────────────────

  func tile(_ b: WButton, height: CGFloat) -> some View {
    Link(destination: URL(string: b.url) ?? URL(string: entry.openUrl)!) {
      VStack(spacing: 3) {
        Image(buttonSticker(b.url)).resizable().scaledToFit().frame(width: 22, height: 22)
        Text(b.label.uppercased())
          .font(Typeface.hand(10))
          .foregroundStyle(Color.ink)
          .lineLimit(1)
          .minimumScaleFactor(0.6)
      }
      .padding(.horizontal, 3)
      .frame(maxWidth: .infinity, minHeight: height, maxHeight: height)
      .background(accent.bg, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
      .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(Color.ink, lineWidth: 2))
    }
  }

  var buttonGrid: some View {
    let rows = stride(from: 0, to: entry.buttons.count, by: 2).map { Array(entry.buttons[$0..<min($0 + 2, entry.buttons.count)]) }
    return VStack(spacing: 6) {
      ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
        HStack(spacing: 6) {
          ForEach(Array(row.enumerated()), id: \.offset) { _, b in tile(b, height: 58) }
        }
      }
    }
  }

  var buttonRow: some View {
    HStack(spacing: 8) {
      ForEach(Array(entry.buttons.enumerated()), id: \.offset) { _, b in tile(b, height: 60) }
    }
  }

  // ─── Large: strip / progress / bars, then stat rows ────────────────────────

  @ViewBuilder var details: some View {
    if let strip = day?.strip {
      HStack(spacing: 2) {
        ForEach(Array(strip.phases.enumerated()), id: \.offset) { i, code in
          let isToday = i + 1 == strip.today
          Circle()
            .fill(phaseColor(code).opacity(isToday ? 1 : 0.7))
            .overlay(Circle().strokeBorder(Color.ink, lineWidth: isToday ? 2 : 0.75))
            .frame(maxWidth: isToday ? 13 : 9, maxHeight: isToday ? 13 : 9)
        }
      }
      .frame(maxWidth: .infinity)
    }
    if let p = day?.progress {
      GeometryReader { geo in
        ZStack(alignment: .leading) {
          Capsule().fill(Color.white.opacity(0.6))
          Capsule().fill(accent.strong).frame(width: max(10, geo.size.width * p))
          Capsule().strokeBorder(Color.ink, lineWidth: 2)
        }
      }
      .frame(height: 12)
    }
    if let series = entry.series, series.kind == "bars" {
      let values = entry.seriesValues(today: today)
      let top = max(values.max() ?? 1, 1)
      HStack(alignment: .bottom, spacing: 6) {
        ForEach(Array(values.enumerated()), id: \.offset) { _, v in
          RoundedRectangle(cornerRadius: 4, style: .continuous)
            .fill(v > 0 ? accent.strong : Color.ink.opacity(0.08))
            .overlay(RoundedRectangle(cornerRadius: 4, style: .continuous).strokeBorder(Color.ink, lineWidth: v > 0 ? 1.5 : 0))
            .frame(height: v > 0 ? max(8, 34 * v / top) : 4)
            .frame(maxWidth: .infinity)
        }
      }
      .frame(height: 34, alignment: .bottom)
    }
    VStack(spacing: 0) {
      ForEach(Array(entry.stats.enumerated()), id: \.offset) { _, s in
        VStack(spacing: 5) {
          HStack(spacing: 8) {
            Text(s.label).font(Typeface.medium(12)).foregroundStyle(Color.ink)
            Spacer(minLength: 4)
            Text(entry.statValue(s, today: today)).font(Typeface.bold(12)).foregroundStyle(Color.ink)
          }
          .lineLimit(1)
          .minimumScaleFactor(0.7)
          Dashed()
        }
        .padding(.top, 5)
      }
    }
    if let footer = day?.hero?.footer, !footer.isEmpty {
      Text(footer).font(Typeface.bold(12)).foregroundStyle(Color.ink).lineLimit(1).minimumScaleFactor(0.7)
    }
    if let series = entry.series, series.kind == "moods" {
      let values = entry.seriesValues(today: today)
      HStack(spacing: 8) {
        ForEach(Array(values.enumerated()), id: \.offset) { _, v in
          if v > 0 {
            Image(moodSticker(v)).resizable().scaledToFit().frame(width: 18, height: 18)
          } else {
            Circle().strokeBorder(Color.ink.opacity(0.25), style: StrokeStyle(lineWidth: 1, dash: [2, 2])).frame(width: 18, height: 18)
          }
        }
      }
    }
  }
}
