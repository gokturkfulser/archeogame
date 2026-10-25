import { z } from "zod";

/** One of the coin’s pieces, as it rises out of the scene it was found in. */
export const pieceSchema = z.object({
  id: z.string(),
  /** Coin art under public/, or the blank coin when the piece is made of letters. */
  image: z.string(),
  /** Letters set in type on top of the piece (the ΕΦ piece). */
  letters: z.string().optional(),
  scene: z.string(),
  sceneImage: z.string(),
  /** Which chime it rings (0–4, a rising pentatonic line). */
  note: z.number().int().min(0).max(4),
});

/** Everything that makes an act ending a film of that act: the film itself is the same for every city. */
export const actEndingSchema = z.object({
  city: z.string(),
  coinTitle: z.string(),
  pieces: z.array(pieceSchema).length(4),
  front: z.string(),
  back: z.string(),
  /** Letters stamped beside the front motif (Ε Φ for Efes); other cities leave them out. */
  frontLetters: z.tuple([z.string(), z.string()]).optional(),
  /** The act’s guide animal: Melissa circles the coin in the air, Kurunta stands beside Deniz with his antlers glowing. */
  guide: z.enum(["melissa", "kurunta"]),
  /** Where the city lies on the paper map, in percent of the map picture. */
  mapX: z.number(),
  mapY: z.number(),
  nextNumber: z.string(),
  nextName: z.string(),
  backdrop: z.object({ sky: z.string(), mid: z.string(), fg: z.string() }),
  curtain: z.string(),
  glow: z.string(),
});

export type ActEndingProps = z.infer<typeof actEndingSchema>;
