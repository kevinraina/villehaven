import { Devvit } from '@devvit/public-api';
import { useState } from 'react';

function VillehavenGame({ postId }: { postId: string }) {
  const [message, setMessage] = useState('Welcome to Villehaven!');

  return (
    <blocks>
      <vstack padding="medium" gap="medium" alignment="center">
        <text size="xlarge" weight="bold">{message}</text>
        <button onPress={() => setMessage('Hello, Villager!')}>
          Click Me
        </button>
      </vstack>
    </blocks>
  );
}

// Registering the custom post type correctly
Devvit.addCustomPostType({
  name: 'Villehaven',
  render: ({ postId }: { postId: string }) => <VillehavenGame postId={postId} />,
});

export default VillehavenGame;
