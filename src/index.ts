import { Devvit } from '@devvit/public-api';
import './app';

Devvit.configure({
  redditAPI: true,
  kvStore: true,
  scheduledPosts: true,
});

Devvit.addCustomPostType({
  name: 'Villehaven',
  description: 'A community-building game focused on environmental stewardship, social connection, and personal growth.',
});

export default Devvit;