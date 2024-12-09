import { Footer as FlowbiteFooter } from 'flowbite-react';

function Footer() {
  return (
    <FlowbiteFooter container className="mt-8 rounded-none bg-transparent">
      <FlowbiteFooter.LinkGroup>
        <FlowbiteFooter.Link
          href="https://github.com/spotDL/spotify-downloader"
          target="_blank"
          className="text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
        >
          Powered by SpotDL - The Open Source Spotify Downloader
        </FlowbiteFooter.Link>
      </FlowbiteFooter.LinkGroup>
    </FlowbiteFooter>
  );
}

export default Footer;
