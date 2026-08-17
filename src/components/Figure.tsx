type FigureProps = {
  id: string;
  caption: string;
  src: string;
  alt?: string;
  number: number;
}

export default function Figure({id, src, alt, caption, number}: FigureProps) {
  return (
    <figure id={id} className="figure">
      <img src={src} alt={alt ?? caption} />
      <figcaption>
        <strong>Figure {number}.</strong> {caption}
      </figcaption>
    </figure>
  );
}