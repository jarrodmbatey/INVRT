// The finished artwork — large, centered, framed only by darkness.

interface Props {
  src: string;
  alt: string;
}

export default function ArtworkView({ src, alt }: Props) {
  return (
    <figure className="fade-in-slow mx-auto w-full max-w-2xl">
      {/* eslint-disable-next-line @next/next/no-img-element -- runtime-written files in /public bypass the image optimizer cache */}
      <img src={src} alt={alt} className="w-full select-none" draggable={false} />
    </figure>
  );
}
