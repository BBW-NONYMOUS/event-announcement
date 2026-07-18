
3. Required Libraries (Install Checklist)

3.1 📱 Mobile App — Expo (Beautiful UI Stack)

Core & Navigation

bashnpx create-expo-app mobile-app
npx expo install expo-router react-native-safe-area-context react-native-screens

UI / Design (the "beautiful" layer)

bash# Styling — Tailwind syntax in React Native
npm install nativewind
npm install -D tailwindcss

# Polished ready-made components (buttons, cards, inputs, modals)

npm install react-native-paper

# Smooth animations & gestures

npx expo install react-native-reanimated react-native-gesture-handler

# Visual flair

npx expo install expo-linear-gradient        # gradient headers/cards
npm install lottie-react-native              # success animations (check-in ✓)
npx expo install @expo/vector-icons          # icon set (Ionicons/Feather)
npx expo install expo-image                  # fast, cached event images
npm install react-native-svg

Feature Libraries

bashnpm install react-native-qrcode-svg          # render ticket QR codes
npm install axios                            # API client
npx expo install expo-secure-store           # secure JWT storage
npx expo install expo-notifications          # push for announcements (optional)
npm install @tanstack/react-query            # server state, caching, refetch
npx expo install react-native-webview        # event location map: Leaflet + OpenStreetMap — NO API key, shows in Expo Go

PurposeLibraryStyling systemNativeWind (Tailwind for RN)Component kitReact Native PaperAnimationsReanimated + LottieIcons / images@expo/vector-icons, expo-imageQR displayreact-native-qrcode-svgData fetchingAxios + TanStack QueryAuth storageexpo-secure-store


**folde structure :**


├── mobile-app/                     # Expo (User App)
│   ├── app/
│   │   ├── (auth)/login.jsx · register.jsx
│   │   ├── (tabs)/index.jsx        # Events list
│   │   ├── (tabs)/tickets.jsx      # My Tickets (QR)
│   │   ├── (tabs)/announcements.jsx
│   │   ├── event/[id].jsx
│   │   └── event/map.jsx           # full-screen map (all events / single venue)
│   ├── components/                 # EventCard, TicketQR, EventMap, SkeletonCard
│   ├── theme/                      # colors.js, typography.js
│   ├── lib/api.js · lib/auth.js
│   └── tailwind.config.js          # NativeWind



**PHASE 2:**



### Phase 2: User App MVP — Expo (Weeks 3–4)

* Auth screens with token in `expo-secure-store`
* Events list with image cards + skeleton loaders (TanStack Query)
* Event detail + Register flow with press animation
* My Tickets: boarding-pass card rendering QR via `react-native-qrcode-svg`
* Announcements feed with pull-to-refresh
* Event map (Leaflet + OpenStreetMap in `react-native-webview`, no API key): auto-centers on the event location; price-pin markers, all-events view from the Events tab and single-venue view from Event detail (web falls back to a venue list). Renders in Expo Go — no dev build needed.
