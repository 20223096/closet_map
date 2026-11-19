import { Pressable, StyleSheet, Text, type PressableProps } from "react-native";

type Props = {
  label: string;
  active?: boolean;
  onPress: NonNullable<PressableProps["onPress"]>;
};

export function Chip({ label, active = false, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active ? styles.active : null]}>
      <Text style={[styles.text, active && styles.activeText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  active: {
    backgroundColor: "#123b35",
    borderColor: "#123b35",
  },
  activeText: {
    color: "#fdf8ef",
  },
  chip: {
    backgroundColor: "#fff9ee",
    borderColor: "#dac9b5",
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  text: {
    color: "#2c2924",
    fontSize: 11,
    fontWeight: "800",
  },
});
