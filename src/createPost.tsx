import { AppContext } from '@devvit/public-api';

export async function createPost(context: AppContext) {
  try {
    const settings = await context.settings.getAll();
    const title = settings.title as string || 'Villehaven - Build a Better World Together!';
    
    // Create a new post with the Villehaven custom post type
    const post = await context.reddit.submitPost({
      subredditName: context.subredditName || '',
      title: title,
      preview: 'Welcome to Villehaven - A community-driven game focused on building a better world together!',
      postType: 'Villehaven'
    });
    
    // Initialize the game state for this post
    await context.trigger('startGame', { postId: post.id });
    
    // Set initial custom post preview
    await context.reddit.setCustomPostPreview({
      postId: post.id,
      preview: 'Villehaven | New game started! | Join now to become one of the founding villagers!'
    });
    
    // Set post flair
    await context.reddit.updatePostFlairText({
      postId: post.id,
      text: 'New Village'
    });
    
    return post.id;
  } catch (error) {
    console.error('Failed to create Villehaven post:', error);
    throw error;
  }
}