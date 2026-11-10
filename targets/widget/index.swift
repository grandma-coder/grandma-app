import SwiftUI
import WidgetKit

@main
struct GrandmaWidgetBundle: WidgetBundle {
  var body: some Widget {
    GrandmaWidget()
  }
}

struct GrandmaWidget: Widget {
  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: "GrandmaWidget", intent: SelectEntryIntent.self, provider: Provider()) { entry in
      WidgetView(entry: entry)
    }
    .configurationDisplayName("Grandma")
    .description("Your journey at a glance, one tap to log.")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
  }
}
