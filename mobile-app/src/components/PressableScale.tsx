// A Pressable that springs down slightly on press — used for cards and the
// register button (per AGENTS.md "Register flow with press animation").
import { type ReactNode } from "react";
import { Pressable, type PressableProps, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = PressableProps & {
  children: ReactNode;
  scaleTo?: number;
  style?: ViewStyle | ViewStyle[];
};

export function PressableScale({
  children,
  scaleTo = 0.96,
  style,
  ...rest
}: Props) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPressIn={() => {
        scale.value = withSpring(scaleTo, { damping: 15, stiffness: 260 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 260 });
      }}
      style={[style as ViewStyle, animatedStyle]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
