import { Box, Paper, Typography } from "@mui/material";
import { DRAFT_SECTION_LABELS, DRAFT_SECTIONS, type ShapeSession } from "@flightdeck/shared";

export function DraftPane(props: { session: ShapeSession }) {
  const draft = props.session.draft;
  return (
    <Paper
      sx={{
        p: 3,
        flex: { xs: "none", lg: 1 },
        minHeight: { xs: 480, lg: 0 },
        height: { lg: "100%" },
        minWidth: 0,
        border: 1,
        borderColor: "divider",
        overflow: "auto",
      }}
      data-testid="draft-pane"
    >
      <Typography variant="h6" sx={{ mb: 3 }}>
        Issue draft
      </Typography>
      <Typography variant="overline" color="text.secondary">
        {DRAFT_SECTION_LABELS.title}
      </Typography>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 650 }} data-testid="draft-title">
        {draft.title || "Untitled"}
      </Typography>
      {DRAFT_SECTIONS.map((key) => (
        <Box key={key} sx={{ mb: 3 }} data-testid={`draft-${key}`}>
          <Typography variant="subtitle1" sx={{ fontWeight: 650, mb: 0.75 }}>
            {DRAFT_SECTION_LABELS[key]}
          </Typography>
          {draft[key] ? (
            <Typography sx={{ whiteSpace: "pre-wrap", color: "text.primary" }}>{draft[key]}</Typography>
          ) : (
            <Typography color="text.secondary" fontStyle="italic">
              Claude will fill this in as you chat.
            </Typography>
          )}
        </Box>
      ))}
    </Paper>
  );
}
