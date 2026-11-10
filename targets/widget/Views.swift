import SwiftUI
import WidgetKit

// Site look (constants/theme.ts + the approved widget mockup): tinted card, ink outline,
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
}

enum Typeface {
  static func hand(_ size: CGFloat) -> Font { .custom("ArchitectsDaughter-Regular", size: size) }
  static func medium(_ size: CGFloat) -> Font { .custom("HankenGrotesk-Medium", size: size) }
  static func bold(_ size: CGFloat) -> Font { .custom("HankenGrotesk-Bold", size: size) }
  static func heavy(_ size: CGFloat) -> Font { .custom("HankenGrotesk-ExtraBold", size: size) }
}

/// Journey colours: `bg` card fill (journey style), `strong` bars and progress, `icon` corner sticker.
struct Accent {
  let bg: Color
  let strong: Color
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

/// Everything a view needs to colour itself, for one style × rendering mode.
struct Palette {
  let card: Color
  let tile: Color
  let ink: Color
  let soft: Color
  let line: Color
  let strong: Color
  let empty: Color
  /// Tinted / clear home screens: no fills, the system colours everything.
  let plain: Bool

  static func make(style: String, journey: String, mode: WidgetRenderingMode) -> Palette {
    let a = Accent.of(journey)
    if mode != .fullColor {
      return Palette(card: .clear, tile: .white.opacity(0.12), ink: .primary, soft: .primary.opacity(0.7), line: .primary.opacity(0.6),
                     strong: .primary.opacity(0.55), empty: .primary.opacity(0.15), plain: true)
    }
    switch style {
    case "cream":
      return Palette(card: .cream, tile: Color(hex: 0xFFFDF8), ink: .ink, soft: Color(hex: 0x4F4B43), line: .ink,
                     strong: a.strong, empty: Color.ink.opacity(0.08), plain: false)
    case "dark":
      return Palette(card: Color(hex: 0x1F1D1A), tile: Color(hex: 0x2B2824), ink: .cream, soft: Color.cream.opacity(0.7), line: Color.cream.opacity(0.85),
                     strong: a.strong, empty: Color.cream.opacity(0.12), plain: false)
    default:
      return Palette(card: a.bg, tile: a.bg, ink: .ink, soft: Color(hex: 0x4F4B43), line: .ink,
                     strong: a.strong, empty: Color.ink.opacity(0.08), plain: false)
    }
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

/// Narrow weekday letters for the 7 days ending on `now`, in the app language ("S T Q Q S S D").
func weekdayLetters(endingOn now: Date, lang: String) -> [String] {
  let f = DateFormatter()
  f.locale = Locale(identifier: lang)
  f.dateFormat = "EEEEE"
  return (0..<7).map { i in f.string(from: now.addingTimeInterval(Double(i - 6) * 86400)).uppercased() }
}

func formatValue(_ v: Double) -> String {
  v == v.rounded() ? String(Int(v)) : String(format: "%.1f", v)
}

extension Image {
  /// Stickers keep their colours on tinted home screens (iOS 18+) instead of turning into flat blobs.
  @ViewBuilder func stickerRendering() -> some View {
    if #available(iOS 18.0, *) {
      self.resizable().widgetAccentedRenderingMode(.fullColor).scaledToFit()
    } else {
      self.resizable().scaledToFit()
    }
  }
}

func sticker(_ name: String, _ size: CGFloat) -> some View {
  Image(name).stickerRendering().frame(width: size, height: size)
}

struct Dashed: View {
  let color: Color
  var body: some View {
    Line()
      .stroke(color.opacity(0.45), style: StrokeStyle(lineWidth: 1, dash: [3, 3]))
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
  let palette: Palette
  var body: some View {
    ZStack {
      palette.card
      if !palette.plain { ContainerRelativeShape().strokeBorder(palette.line, lineWidth: 2.5) }
    }
  }
}

struct WidgetView: View {
  let entry: GrandmaEntry
  @Environment(\.widgetFamily) var family
  @Environment(\.widgetRenderingMode) var mode

  var body: some View {
    switch entry.state {
    case .ok(let e):
      let palette = Palette.make(style: entry.style, journey: e.journey, mode: mode)
      JourneyView(entry: e, config: entry, palette: palette, family: family)
        .containerBackground(for: .widget) { CardBackground(palette: palette) }
    case .signedOut(let text), .outdated(let text):
      message(text, "grandma-app://")
    case .pickChild(let text):
      message(text, "grandma-app://log/kids/home")
    case .start(let text, let url), .refresh(let text, let url):
      message(text, url)
    }
  }

  func message(_ text: String, _ url: String) -> some View {
    let palette = Palette.make(style: entry.style == "dark" ? "dark" : "cream", journey: "", mode: mode)
    return MessageView(text: text, url: url, palette: palette)
      .containerBackground(for: .widget) { CardBackground(palette: palette) }
  }
}

struct MessageView: View {
  let text: String
  let url: String
  let palette: Palette
  var body: some View {
    VStack(spacing: 8) {
      sticker("st_heart", 30)
      Text(text)
        .font(Typeface.hand(17))
        .foregroundStyle(palette.ink)
        .multilineTextAlignment(.center)
        .minimumScaleFactor(0.7)
    }
    .padding()
    .widgetURL(URL(string: url))
  }
}

struct JourneyView: View {
  let entry: WEntry
  let config: GrandmaEntry
  let palette: Palette
  let family: WidgetFamily

  var accent: Accent { Accent.of(entry.journey) }
  var today: String { isoDay(config.date) }
  var day: WDay? { entry.day(for: today) }
  var small: Bool { family == .systemSmall }
  var buttons: [WButton] { entry.buttons(picked: config.picked) }

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
        Image(uiImage: img).stickerRendering().frame(width: small ? 34 : 40, height: small ? 34 : 40)
      } else {
        sticker(accent.icon, 26)
      }
    }
  }

  var bigText: String {
    guard let hero = day?.hero else { return "" }
    if hero.live == true, let since = entry.sinceLast, let at = parseISODate(since.at) { return compactSince(at, now: config.date) }
    return hero.big
  }

  var header: some View {
    HStack(alignment: .top, spacing: 6) {
      VStack(alignment: .leading, spacing: 2) {
        if entry.state == "empty" {
          eyebrow(entry.name)
          Text(entry.emptyText ?? "")
            .font(Typeface.hand(small ? 15 : 17))
            .foregroundStyle(palette.ink)
            .lineLimit(4)
            .minimumScaleFactor(0.7)
            .padding(.top, 4)
        } else if let hero = day?.hero {
          eyebrow(hero.eyebrow)
          if !bigText.isEmpty {
            HStack(alignment: .firstTextBaseline, spacing: 4) {
              Text(bigText).font(Typeface.heavy(small ? 40 : 44)).foregroundStyle(palette.ink).widgetAccentable()
              if !hero.unit.isEmpty { Text(hero.unit).font(Typeface.bold(small ? 15 : 17)).foregroundStyle(palette.ink) }
            }
            .lineLimit(1)
            .minimumScaleFactor(0.5)
          }
          if !hero.caption.isEmpty {
            Text(hero.caption)
              .font(Typeface.hand(bigText.isEmpty ? 18 : 15))
              .foregroundStyle(palette.ink)
              .lineLimit(2)
              .minimumScaleFactor(0.7)
          }
        } else if let day {
          eyebrow(entry.name)
          Text(day.title).font(Typeface.hand(17)).foregroundStyle(palette.ink).lineLimit(2).minimumScaleFactor(0.7)
        }
      }
      Spacer(minLength: 0)
      cornerIcon
    }
  }

  func eyebrow(_ text: String) -> some View {
    Text(text.uppercased())
      .font(Typeface.hand(11))
      .foregroundStyle(palette.soft)
      .lineLimit(small ? 2 : 1)
      .minimumScaleFactor(0.7)
  }

  @ViewBuilder var footerBlock: some View {
    if let footer = day?.hero?.footer, !footer.isEmpty {
      VStack(alignment: .leading, spacing: 6) {
        Dashed(color: palette.line)
        Text(footer).font(Typeface.bold(12)).foregroundStyle(palette.ink).lineLimit(2).minimumScaleFactor(0.7)
      }
    }
  }

  // ─── Log buttons: sticker tiles ────────────────────────────────────────────

  func tile(_ b: WButton, height: CGFloat) -> some View {
    Link(destination: URL(string: b.url) ?? URL(string: entry.openUrl)!) {
      VStack(spacing: 3) {
        sticker("st_\(b.sticker ?? "star")", 22)
        Text(b.label.uppercased())
          .font(Typeface.hand(10))
          .foregroundStyle(palette.ink)
          .lineLimit(1)
          .minimumScaleFactor(0.55)
      }
      .padding(.horizontal, 3)
      .frame(maxWidth: .infinity, minHeight: height, maxHeight: height)
      .background(palette.tile, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
      .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(palette.line, lineWidth: palette.plain ? 1 : 2))
    }
  }

  var buttonGrid: some View {
    let all = buttons
    let rows = stride(from: 0, to: all.count, by: 2).map { Array(all[$0..<min($0 + 2, all.count)]) }
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
      ForEach(Array(buttons.enumerated()), id: \.offset) { _, b in tile(b, height: 60) }
    }
  }

  // ─── Large: chart, then stat rows ──────────────────────────────────────────

  var letters: [String] { weekdayLetters(endingOn: config.date, lang: config.lang) }

  @ViewBuilder var details: some View {
    if let strip = day?.strip { stripChart(strip) }
    if let p = day?.progress { progressChart(p) }
    if let series = entry.series, series.kind == "bars" { barChart(series) }
    statRows
    if entry.journey == "kids", let footer = day?.hero?.footer, !footer.isEmpty {
      Text(footer).font(Typeface.bold(12)).foregroundStyle(palette.ink).lineLimit(1).minimumScaleFactor(0.7)
    }
    if let series = entry.series, series.kind == "moods" { moodChart(series) }
  }

  var statRows: some View {
    VStack(spacing: 0) {
      ForEach(Array(entry.stats.enumerated()), id: \.offset) { _, s in
        VStack(spacing: 4) {
          HStack(spacing: 8) {
            Text(s.label).font(Typeface.medium(12)).foregroundStyle(palette.ink)
            Spacer(minLength: 4)
            Text(entry.statValue(s, today: today)).font(Typeface.bold(12)).foregroundStyle(palette.ink)
          }
          .lineLimit(1)
          .minimumScaleFactor(0.7)
          Dashed(color: palette.line)
        }
        .padding(.top, 4)
      }
    }
  }

  func chartTitle(_ label: String, _ summary: String?) -> some View {
    HStack(alignment: .firstTextBaseline) {
      Text(label).font(Typeface.hand(12)).foregroundStyle(palette.soft).lineLimit(1)
      Spacer(minLength: 6)
      if let summary { Text(summary).font(Typeface.bold(11)).foregroundStyle(palette.ink).lineLimit(1) }
    }
    .minimumScaleFactor(0.7)
  }

  func dayLetter(_ i: Int) -> some View {
    // Today: the letter in a filled ink dot (on tinted screens just heavier, since there is no fill).
    let ringed = i == 6 && !palette.plain
    return Text(i < letters.count ? letters[i] : "")
      .font(i == 6 ? Typeface.heavy(10) : Typeface.medium(10))
      .foregroundStyle(ringed ? palette.card : (i == 6 ? palette.ink : palette.soft))
      .frame(width: 16, height: 16)
      .background(Circle().fill(ringed ? palette.ink : .clear))
      .frame(maxWidth: .infinity)
  }

  /// Seven labelled columns: value on top, weekday under, today ringed.
  func barChart(_ series: WSeries) -> some View {
    let values = entry.seriesValues(today: today)
    let top = max(series.scaleMax ?? 0, values.max() ?? 0, 1)
    let barMax: CGFloat = 34
    return VStack(spacing: 4) {
      chartTitle(series.label, series.summary)
      HStack(alignment: .bottom, spacing: 6) {
        ForEach(Array(values.enumerated()), id: \.offset) { i, v in
          VStack(spacing: 2) {
            Text(v > 0 ? formatValue(v) : "–")
              .font(Typeface.bold(10))
              .foregroundStyle(v > 0 ? palette.ink : palette.soft)
            RoundedRectangle(cornerRadius: 4, style: .continuous)
              .fill(v > 0 ? palette.strong : palette.empty)
              .overlay(
                RoundedRectangle(cornerRadius: 4, style: .continuous)
                  .strokeBorder(palette.line, lineWidth: v > 0 ? (i == 6 ? 2.5 : 1.5) : 0)
              )
              .frame(height: v > 0 ? max(6, barMax * CGFloat(v / top)) : 3)
          }
          .frame(maxWidth: .infinity)
        }
      }
      .frame(height: barMax + 14, alignment: .bottom)
      HStack(spacing: 6) { ForEach(0..<7, id: \.self) { dayLetter($0) } }
    }
  }

  /// Seven mood faces with their weekday; empty days are a dashed ring.
  func moodChart(_ series: WSeries) -> some View {
    let values = entry.seriesValues(today: today)
    return VStack(spacing: 3) {
      chartTitle(series.label, nil)
      HStack(spacing: 6) {
        ForEach(Array(values.enumerated()), id: \.offset) { _, v in
          Group {
            if v > 0 {
              sticker(moodSticker(v), 20)
            } else {
              Circle().strokeBorder(palette.line.opacity(0.4), style: StrokeStyle(lineWidth: 1, dash: [2, 2])).frame(width: 20, height: 20)
            }
          }
          .frame(maxWidth: .infinity)
        }
      }
      HStack(spacing: 6) { ForEach(0..<7, id: \.self) { dayLetter($0) } }
    }
  }

  /// One dot per cycle day, today big and ringed, plus a phase legend.
  func stripChart(_ strip: WStrip) -> some View {
    VStack(alignment: .leading, spacing: 5) {
      HStack(spacing: 2) {
        ForEach(Array(strip.phases.enumerated()), id: \.offset) { i, code in
          let isToday = i + 1 == strip.today
          Circle()
            .fill(phaseColor(code).opacity(isToday ? 1 : 0.75))
            .overlay(Circle().strokeBorder(palette.line, lineWidth: isToday ? 2 : 0.75))
            .frame(maxWidth: isToday ? 14 : 9, maxHeight: isToday ? 14 : 9)
        }
      }
      .frame(maxWidth: .infinity)
      HStack(spacing: 10) {
        ForEach(["m", "f", "o", "l"], id: \.self) { code in
          HStack(spacing: 4) {
            Circle().fill(phaseColor(code)).overlay(Circle().strokeBorder(palette.line, lineWidth: 0.75)).frame(width: 8, height: 8)
            Text(config.phases[code] ?? "").font(Typeface.medium(10)).foregroundStyle(palette.soft).lineLimit(1)
          }
        }
      }
      .minimumScaleFactor(0.7)
    }
  }

  /// Weeks 1–40 with the baby-size sticker riding on today's week.
  func progressChart(_ p: Double) -> some View {
    VStack(spacing: 3) {
      GeometryReader { geo in
        let w = geo.size.width
        ZStack(alignment: .leading) {
          Capsule().fill(palette.empty).frame(height: 12)
          Capsule().fill(palette.strong).frame(width: max(12, w * p), height: 12)
          Capsule().strokeBorder(palette.line, lineWidth: 2).frame(height: 12)
          cornerMarker.offset(x: min(max(0, w * p - 13), w - 26))
        }
        .frame(height: 28)
      }
      .frame(height: 28)
      HStack {
        Text(entry.progressEnds?.first ?? "").font(Typeface.medium(10)).foregroundStyle(palette.soft)
        Spacer()
        Text(entry.progressEnds?.last ?? "").font(Typeface.medium(10)).foregroundStyle(palette.soft)
      }
    }
  }

  var cornerMarker: some View {
    Group {
      if let b64 = entry.image, let data = Data(base64Encoded: b64), let img = UIImage(data: data) {
        Image(uiImage: img).stickerRendering().frame(width: 26, height: 26)
      } else {
        sticker(accent.icon, 22)
      }
    }
  }
}
