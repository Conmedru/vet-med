import fs from "fs"
import path from "path"
import matter from "gray-matter"
import { Article } from "./data"

const articlesDirectory = path.join(process.cwd(), "content/articles")

export type MDXArticle = Article & {
  slug: string
  content: string // MDX content string
}

export function getArticleSlugs() {
  if (!fs.existsSync(articlesDirectory)) {
    return []
  }
  return fs.readdirSync(articlesDirectory).filter((file) => file.endsWith(".mdx"))
}

export function getArticleBySlug(slug: string): MDXArticle | null {
  const realSlug = slug.replace(/\.mdx$/, "")
  const fullPath = path.join(articlesDirectory, `${realSlug}.mdx`)

  if (!fs.existsSync(fullPath)) {
    return null
  }

  const fileContents = fs.readFileSync(fullPath, "utf8")
  const { data, content } = matter(fileContents)

  return {
    ...data,
    id: realSlug,
    content,
  } as MDXArticle
}

export function getAllArticles(): MDXArticle[] {
  const slugs = getArticleSlugs()
  const articles = slugs
    .map((slug) => getArticleBySlug(slug))
    .filter((article): article is MDXArticle => article !== null)
    .sort((article1, article2) => (article1.date > article2.date ? -1 : 1))
  
  return articles
}
