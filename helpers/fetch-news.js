import Parser from "rss-parser";

const parser = new Parser();

export default async function fetchNews() {
  const result = await parser.parseURL(
    "http://feeds.bbci.co.uk/news/technology/rss.xml"
  );

  const newsItems = result.items.map((item) => ({
    title: item.title,
    link: item.link,
    content: item.contentSnippet || item.content || "", 
  }));

  return newsItems;
}