# rishabh.github.io



import React, { Component } from 'react';
import ChatBot from 'react-simple-chatbot';

class SupportBot extends Component {
  constructor(props) {
    super(props);

    this.state = {
      steps: [
        {
          id: '1',
          message: 'Welcome to our support bot! How can I assist you today?',
          trigger: 'searchKeyword'
        },
        {
          id: 'searchKeyword',
          message: 'Please enter a keyword related to your question:',
          trigger: 'searchResult'
        },
        {
          id: 'searchResult',
          user: true,
          trigger: 'displayResult'
        },
        {
          id: 'displayResult',
          component: <SearchResult />,
          waitAction: true,
          trigger: 'menu'
        },
        {
          id: 'menu',
          options: [
            { value: '1', label: 'What is your product?', trigger: 'product' },
            { value: '2', label: 'How do I get started?', trigger: 'gettingStarted' },
            { value: '3', label: 'How do I contact support?', trigger: 'contactSupport' }
          ]
        },
        {
          id: 'product',
          message: 'Our product is a chatbot builder that allows you to easily create conversational interfaces for your website or application.',
          trigger: 'backToMenu'
        },
        {
          id: 'gettingStarted',
          message: 'To get started, simply sign up for an account on our website and start building your chatbot!',
          trigger: 'backToMenu'
        },
        {
          id: 'contactSupport',
          message: 'You can contact our support team by emailing support@chatbotbuilder.com or by filling out the contact form on our website.',
          trigger: 'backToMenu'
        },
        {
          id: 'backToMenu',
          message: 'Do you have any other questions?',
          trigger: 'menuOrEnd'
        },
        {
          id: 'menuOrEnd',
          options: [
            { value: 'menu', label: 'Back to Menu', trigger: 'menu' },
            { value: 'end', label: 'End Conversation', trigger: 'end' }
          ]
        },
        {
          id: 'end',
          message: 'Thank you for using our support bot. Have a great day!',
          end: true
        }
      ]
    };
  }

  render() {
    return (
      <ChatBot
        steps={this.state.steps}
        floating={true}
        headerTitle="Support Bot"
        botAvatar="https://i.imgur.com/nh2QnWZ.png"
        enableMobileAutoFocus={true}
      />
    );
  }
}

// Custom component to display search result
const SearchResult = (props) => {
  const { previousStep, triggerNextStep } = props;
  const keyword = previousStep.message.toLowerCase();

  // Search logic to match the keyword with menu options
  const searchOptions = [
    { value: '1', label: 'What is your product?', trigger: 'product' },
    { value: '2', label: 'How do I get started?', trigger: 'gettingStarted' },
    { value: '3', label: 'How do I contact support?', trigger: 'contactSupport' }
  ];

  const searchResult = searchOptions.filter(option => option.label.toLowerCase().includes(keyword));

  if (searchResult.length > 0) {
    return (
      <div>
        <p>Here are the matching results for your search:</p>
        <ul>
          {searchResult.map(result => (
            <li key={result.value} onClick={() => triggerNextStep({ value: result.value })}>
              {result.label}
            </li>
          ))}
        </ul>
      </div>
    );
  } else {
    return <p>No matching results found for your search.</p>;
  }
}

export default SupportBot;
