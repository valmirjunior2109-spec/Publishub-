const PAGE_URL = "https://www.producthunt.com/products/publishub?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-publishub";
const IMAGE_URL = "https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1299706&theme=dark&t=1793556707232";

/** O selo do Product Hunt, como eles entregam: o SVG é servido por lá e leva à página do produto. */
export function ProductHuntBadge({ className }: { className?: string }) {
  return (
    <a href={PAGE_URL} target="_blank" rel="noopener noreferrer" className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG do widget do Product Hunt: tem de vir do servidor deles, sem passar pela otimização */}
      <img alt="Publishub - Your AI copilot for video editing workflows. | Product Hunt" width={250} height={54} src={IMAGE_URL} />
    </a>
  );
}
