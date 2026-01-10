<?xml version="1.0" encoding="utf-8"?>
<!--

# Pretty Feed

Styles an RSS/Atom feed, making it friendly for humans viewers, and adds a link
to aboutfeeds.com for new user onboarding. See it in action:

   https://interconnected.org/home/feed


## How to use

1. Download this XML stylesheet from the following URL and host it on your own
   domain (this is a limitation of XSL in browsers):

   https://github.com/genmon/aboutfeeds/blob/main/tools/pretty-feed-v3.xsl

2. Include the XSL at the top of the RSS/Atom feed, like:

```
<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet href="/PATH-TO-YOUR-STYLES/pretty-feed-v3.xsl" type="text/xsl"?>
```

3. Serve the feed with the following HTTP headers:

```
Content-Type: application/xml; charset=utf-8  # not application/rss+xml
x-content-type-options: nosniff
```

(These headers are required to style feeds for users with Safari on iOS/Mac.)



## Limitations

- Styling the feed *prevents* the browser from automatically opening a
  newsreader application. This is a trade off, but it's a benefit to new users
  who won't have a newsreader installed, and they are saved from seeing or
  downloaded obscure XML content. For existing newsreader users, they will know
  to copy-and-paste the feed URL, and they get the benefit of an in-browser feed
  preview.
- Feed styling, for all browsers, is only available to site owners who control
  their own platform. The need to add both XML and HTTP headers makes this a
  limited solution.


## Credits

pretty-feed is based on work by lepture.com:

   https://lepture.com/en/2019/rss-style-with-xsl

This current version is maintained by aboutfeeds.com:

   https://github.com/genmon/aboutfeeds


## Feedback

This file is in BETA. Please test and contribute to the discussion:

     https://github.com/genmon/aboutfeeds/issues/8

-->
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes" />
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="en">
      <head>
        <title><xsl:value-of select="/rss/channel/title" /> Web Feed</title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <style>
          @font-face {
            font-display: swap;
            font-family: 'BerkeleyMono';
            font-style: normal;
            font-weight: 400;
            src: url("/fonts/BerkeleyMono-Regular.woff") format("woff");
          }

          :root {
            --font-mono: BerkeleyMono, Consolas, Monaco, Liberation Mono, Lucida Console, monospace;
            --font-body: BerkeleyMono, sans-serif;
            --base_00: #1b1818;
            --base_01: #292424;
            --base_02: #585050;
            --base_03: #655d5d;
            --base_04: #7e7777;
            --base_07: #f4ecec;
            --base_08: #ca4949;
            --base_09: #b45a3c;
            --base_0a: #a06e3b;
            --base_0b: #4b8b8b;
            --base_0c: #5485b6;
            --base_0d: #7272ca;
            --base_0e: #8464c4;
            --base_0f: #bd5187;
            --background-color: var(--base_07);
            --text-color: var(--base_01);
            --accent-color: var(--base_0b);
          }

          @media (prefers-color-scheme: dark) {
            :root {
              --background-color: var(--base_01);
              --text-color: var(--base_07);
            }
          }

          h1, h2, h3, h4, strong {
            font-weight: 700;
          }

          body {
            font-size: 1.2rem;
            line-height: 1.5;
            font-family: var(--font-body), sans-serif;
            background: var(--background-color);
            color: var(--text-color);
            padding: 1rem;
          }

          a {
            color: currentcolor;
            text-decoration-color: var(--text-color);
          }

          a:hover {
            text-decoration-color: var(--accent-color);
          }

          :focus-visible {
            outline: none;
            box-shadow:
              0 0 0 2px var(--accent-color),
              0 0 0 4px var(--background-color),
              0 0 0 6px var(--text-color);
          }

          fieldset {
            border: 1px solid var(--base_03);
            padding: 0.75rem 1rem;
            margin: 1rem 0;
            max-width: 800px;
          }

          fieldset:first-of-type {
            padding: 0.25rem 0.75rem;
          }

          fieldset:first-of-type p {
            margin: 0.5em 0;
          }

          fieldset:hover,
          fieldset:focus-within {
            border-color: var(--accent-color);
          }

          fieldset legend {
            padding: 0 0.5em;
            color: var(--base_02);
            font-weight: bold;
            font-size: 0.75rem;
            text-transform: lowercase;
          }

          fieldset:hover legend,
          fieldset:focus-within legend {
            color: var(--accent-color);
          }

          .container {
            max-width: 800px;
          }

          .item {
            margin-bottom: 0.5em;
          }

          .item a {
            text-decoration: none;
          }

          .item a:hover {
            text-decoration: underline;
          }

          .text-gray {
            color: var(--base_02);
          }

          @media (prefers-color-scheme: dark) {
            .text-gray {
              color: var(--base_04);
            }
          }
        </style>
        <script>
          (function () {
            if (typeof Temporal === 'undefined') return;
            var days = ['8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];
            var day = Temporal.Now.plainDateISO().day;
            var hex = days[day % 8];
            document.documentElement.style.setProperty('--accent-color', 'var(--base_0' + hex + ')');
          })();
        </script>
      </head>
      <body>
        <fieldset>
          <legend>about this feed</legend>
          <p>Wow, check out this RSS feed. Pretty neat!</p>
          <p>You can <strong>subscribe</strong> to my stuff by copying the URL from the address bar into your newsreader.</p>
          <p class="text-gray">Visit <a href="https://aboutfeeds.com">About Feeds</a> to get started with newsreaders and subscribing. It's free.</p>
          <p>
            <a>
              <xsl:attribute name="href">
                <xsl:value-of select="/rss/channel/link" />
              </xsl:attribute>
              Visit Website &#x2192;
            </a>
          </p>
        </fieldset>
        <fieldset class="container">
          <legend>recent items</legend>
          <xsl:for-each select="/rss/channel/item">
            <div class="item">
              <a target="_blank">
                <xsl:attribute name="href">
                  <xsl:value-of select="link" />
                </xsl:attribute>
                <xsl:value-of select="title" />
              </a>
              <br />
              <small class="text-gray">Published: <xsl:value-of select="pubDate" /></small>
            </div>
          </xsl:for-each>
        </fieldset>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
