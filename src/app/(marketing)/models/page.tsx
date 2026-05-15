import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductTopTabs } from "@/components/marketing/product-top-tabs";
import { ModelsBrowser } from "../pricing/models-browser";
import {
  buildAbsoluteUrl,
  buildModelCanonicalPath,
  buildModelSeoDescription,
  buildModelSeoKeywords,
  buildModelSeoTitle,
  buildModelStructuredData,
  findModelDocRowByRoute,
  loadModelsPageData,
  matchModelDocRow,
} from "./data";

export const metadata: Metadata = {
  title: "Models — OpenOctopus",
  description: "Model catalog, API docs, and live pricing sourced from internal model configuration.",
};

type ModelsPageShellProps = {
  initialProvider?: string;
  initialModelSlug?: string;
};

export async function generateProviderModelMetadata({
  params,
}: {
  params: Promise<{ provider: string; modelSlug: string[] }>;
}): Promise<Metadata> {
  const resolved = await params;
  const provider = decodeURIComponent(resolved.provider);
  const modelSlug = decodeURIComponent(
    Array.isArray(resolved.modelSlug) ? resolved.modelSlug.join("/") : ""
  );
  const model = await findModelDocRowByRoute(provider, modelSlug);

  if (!model) {
    return {
      title: "Model Not Found | OpenOctopus",
      description: "The requested model page could not be found.",
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  const title = buildModelSeoTitle(model);
  const description = buildModelSeoDescription(model);
  const canonicalPath = buildModelCanonicalPath(model);
  const canonicalUrl = buildAbsoluteUrl(canonicalPath);
  const shareImage = model.coverImageUrl || model.showcaseImageUrls[0] || undefined;

  return {
    title,
    description,
    keywords: buildModelSeoKeywords(model),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "article",
      url: canonicalUrl,
      title,
      description,
      images: shareImage
        ? [
            {
              url: shareImage,
              alt: `${model.displayName} showcase image`,
            },
          ]
        : undefined,
    },
    twitter: {
      card: shareImage ? "summary_large_image" : "summary",
      title,
      description,
      images: shareImage ? [shareImage] : undefined,
    },
  };
}

export async function ModelsPageShell({
  initialProvider,
  initialModelSlug,
}: ModelsPageShellProps) {
  const { modelDocRows, vendorOptions } = await loadModelsPageData();
  const selectedModel =
    initialProvider && initialModelSlug
      ? matchModelDocRow(modelDocRows, initialProvider, initialModelSlug)
      : null;

  return (
    <main className="relative mx-auto w-full max-w-7xl px-4 pb-10 pt-4 sm:px-5 xl:px-0">
      {selectedModel ? (
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(buildModelStructuredData(selectedModel)),
          }}
        />
      ) : null}
      <ProductTopTabs />
      <div className="mb-2">
        <ModelsBrowser
          rows={modelDocRows}
          vendorOptions={vendorOptions}
          initialProvider={initialProvider}
          initialModelSlug={initialModelSlug}
        />
      </div>
    </main>
  );
}

export default async function ModelsPage() {
  return <ModelsPageShell />;
}

export async function ModelsProviderModelPage({
  params,
}: {
  params: Promise<{ provider: string; modelSlug: string[] }>;
}) {
  const resolved = await params;
  const provider = decodeURIComponent(resolved.provider);
  const modelSlug = decodeURIComponent(
    Array.isArray(resolved.modelSlug) ? resolved.modelSlug.join("/") : ""
  );
  const model = await findModelDocRowByRoute(provider, modelSlug);

  if (!model) {
    notFound();
  }

  return <ModelsPageShell initialProvider={provider} initialModelSlug={modelSlug} />;
}
