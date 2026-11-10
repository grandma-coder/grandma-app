import SwiftUI
import WidgetKit

// Site-look palette (constants/theme.ts).
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

struct Accent {
  let soft: Color
  let ink: Color

  static func of(_ journey: String) -> Accent {
    switch journey {
    case "cycle": return Accent(soft: Color(hex: 0xF9CFE0), ink: Color(hex: 0x8E3A56))
    case "pregnancy": return Accent(soft: Color(hex: 0xDCCFF9), ink: Color(hex: 0x3A2A6E))
    case "kids": return Accent(soft: Color(hex: 0xCFE1FA), ink: Color(hex: 0x1F4A7A))
    default: return Accent(soft: Color(hex: 0xFBD3B3), ink: Color(hex: 0x8B4A26))
    }
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

struct WidgetView: View {
  let entry: GrandmaEntry
  @Environment(\.widgetFamily) var family

  var body: some View {
    Group {
      switch entry.state {
      case .ok(let e): JourneyView(entry: e, today: isoDay(entry.date), family: family)
      case .signedOut(let text), .outdated(let text): MessageView(text: text, url: "grandma-app://")
      case .pickChild(let text): MessageView(text: text, url: "grandma-app://log/kids/home")
      case .start(let text, let url), .refresh(let text, let url): MessageView(text: text, url: url)
      }
    }
    .containerBackground(Color.cream, for: .widget)
  }
}

struct MessageView: View {
  let text: String
  let url: String
  var body: some View {
    VStack(spacing: 8) {
      Text("Grandma").font(.system(.caption, design: .rounded).weight(.bold)).foregroundStyle(Color.inkMuted)
      Text(text)
        .font(.system(.headline, design: .rounded))
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
  let family: WidgetFamily

  var accent: Accent { Accent.of(entry.journey) }
  var day: WDay? { entry.day(for: today) }

  var body: some View {
    VStack(alignment: .leading, spacing: family == .systemSmall ? 6 : 10) {
      header
      if family != .systemSmall { buttons }
      if family == .systemLarge { details }
      if family != .systemLarge { Spacer(minLength: 0) }
    }
    .padding(family == .systemSmall ? 14 : 16)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .widgetURL(URL(string: entry.openUrl))
  }

  // Name, today's lines, fruit / since-last.
  var header: some View {
    HStack(alignment: .top, spacing: 10) {
      VStack(alignment: .leading, spacing: 4) {
        // Kids titles already start with the child's name ("Leo · 8mo") — don't say it twice.
        if !(day?.title.hasPrefix(entry.name) ?? false) {
          Text(entry.name.uppercased())
            .font(.system(size: 11, weight: .bold, design: .rounded))
            .foregroundStyle(accent.ink)
            .lineLimit(1)
        }
        if entry.state == "empty" {
          Text(entry.emptyText ?? "")
            .font(.system(.subheadline, design: .rounded).weight(.semibold))
            .foregroundStyle(Color.ink)
            .lineLimit(4)
            .minimumScaleFactor(0.7)
        } else if let day {
          Text(day.title)
            .font(.system(family == .systemSmall ? .headline : .title3, design: .rounded).weight(.bold))
            .foregroundStyle(Color.ink)
            .lineLimit(2)
            .minimumScaleFactor(0.7)
          if !day.subtitle.isEmpty {
            Text(day.subtitle)
              .font(.system(.footnote, design: .rounded))
              .foregroundStyle(Color.inkSoft)
              .lineLimit(2)
              .minimumScaleFactor(0.7)
          }
          if let since = entry.sinceLast, let at = parseISODate(since.at) {
            (Text(at, style: .relative).monospacedDigit() + Text(" " + since.label))
            .font(.system(.caption, design: .rounded))
            .foregroundStyle(Color.inkSoft)
            .lineLimit(1)
            .minimumScaleFactor(0.6)
          }
        }
      }
      Spacer(minLength: 0)
      if let b64 = entry.image, let data = Data(base64Encoded: b64), let img = UIImage(data: data) {
        Image(uiImage: img)
          .resizable()
          .scaledToFit()
          .frame(width: family == .systemSmall ? 44 : 64, height: family == .systemSmall ? 44 : 64)
      }
    }
  }

  var buttons: some View {
    HStack(spacing: 6) {
      ForEach(Array(entry.buttons.enumerated()), id: \.offset) { _, b in
        if let url = URL(string: b.url) {
          Link(destination: url) {
            Text(b.label)
              .font(.system(size: 12, weight: .semibold, design: .rounded))
              .foregroundStyle(accent.ink)
              .lineLimit(1)
              .minimumScaleFactor(0.6)
              .frame(maxWidth: .infinity)
              .padding(.vertical, 8)
              .background(accent.soft, in: Capsule())
              .overlay(Capsule().stroke(Color.ink.opacity(0.12), lineWidth: 1))
          }
        }
      }
    }
  }

  @ViewBuilder var details: some View {
    if let strip = day?.strip {
      HStack(spacing: 2) {
        ForEach(Array(strip.phases.enumerated()), id: \.offset) { i, code in
          Circle()
            .fill(phaseColor(code).opacity(i + 1 == strip.today ? 1 : 0.55))
            .overlay(Circle().stroke(Color.ink, lineWidth: i + 1 == strip.today ? 1.5 : 0))
            .frame(maxWidth: 10, maxHeight: 10)
        }
      }
    }
    if let p = day?.progress {
      GeometryReader { geo in
        ZStack(alignment: .leading) {
          Capsule().fill(Color.ink.opacity(0.08))
          Capsule().fill(accent.soft).frame(width: geo.size.width * p)
          Capsule().stroke(Color.ink.opacity(0.15), lineWidth: 1)
        }
      }
      .frame(height: 10)
    }
    VStack(spacing: 6) {
      ForEach(Array(entry.stats.enumerated()), id: \.offset) { _, s in
        HStack {
          Text(s.label).foregroundStyle(Color.inkSoft)
          Spacer()
          Text(entry.statValue(s, today: today)).foregroundStyle(Color.ink).fontWeight(.semibold)
        }
        .font(.system(.footnote, design: .rounded))
        .lineLimit(1)
        .minimumScaleFactor(0.7)
      }
    }
    if let series = entry.series {
      let values = entry.seriesValues(today: today)
      VStack(alignment: .leading, spacing: 4) {
        Text(series.label).font(.system(.caption2, design: .rounded)).foregroundStyle(Color.inkMuted)
        HStack(alignment: .bottom, spacing: 6) {
          let top = max(values.max() ?? 1, series.kind == "moods" ? 5 : 1)
          ForEach(Array(values.enumerated()), id: \.offset) { _, v in
            RoundedRectangle(cornerRadius: 3)
              .fill(v > 0 ? accent.soft : Color.ink.opacity(0.06))
              .overlay(RoundedRectangle(cornerRadius: 3).stroke(Color.ink.opacity(v > 0 ? 0.2 : 0), lineWidth: 1))
              .frame(height: max(4, 36 * v / top))
              .frame(maxWidth: .infinity)
          }
        }
        .frame(height: 36, alignment: .bottom)
      }
    }
  }
}
