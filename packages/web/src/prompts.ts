// SPDX-License-Identifier: Apache-2.0
// Round prompts. The contract only knows option numbers 0..n-1; labels live in the UI and stay fixed for a round.

export interface Prompt {
  question: string;
  options: string[];
}

export const PROMPTS: Prompt[] = [
  { question: 'You lost each other in a huge train station. Where do you wait?', options: ['Under the big clock', 'Main entrance', 'Ticket hall', 'Platform 1'] },
  { question: 'Pick the number the other two will pick.', options: ['1', '3', '7', '10'] },
  { question: 'One pizza for the three of you. One topping.', options: ['Margherita', 'Pepperoni', 'Mushroom', 'Pineapple'] },
  { question: 'Meet tomorrow, no messages allowed. What time?', options: ['9:00', '12:00', '15:00', '18:00'] },
  { question: 'A city none of you know. Where do you find each other?', options: ['The biggest square', 'The main station', 'The river bridge', 'The tallest tower'] },
  { question: 'The team gets one colour.', options: ['Red', 'Blue', 'Black', 'White'] },
  { question: 'Saturday plan for the three of you.', options: ['Long hike', 'Movie night', 'Board games', 'Sleep in'] },
  { question: 'Heads or tails?', options: ['Heads', 'Tails'] },
];
