import { Box, Heading, Text } from "@primer/react";

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <Box sx={{ p: [3, 4] }}>
      <Heading as="h2">{title}</Heading>
      <Text as="p" sx={{ color: "fg.muted", mt: 2 }}>
        Coming in a later phase.
      </Text>
    </Box>
  );
}
