import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useUserContext } from '../Data/UserData';
import { useUnseenMessages } from '../Data/UnseenMessagesContext';
import API_BASE_URL from '../config';
import { io, Socket } from 'socket.io-client';

interface User {
  user_id: string | number;
  first_name: string;
  last_name: string;
  email: string;
  profile_pic?: string | null;
  role: string;
}

interface Message {
  message_id: string | number;
  sender_id: string | number;
  message: string;
  created_at: string;
  first_name?: string;
  last_name?: string;
  profile_pic?: string | null;
}

interface Group {
  group_id: string | number;
  group_name: string;
  created_at: string;
  message_count?: number;
  is_announcement?: boolean;
}

interface Announcement {
  announcement_id: number;
  auth_id: number;
  title: string;
  message: string;
  created_at: string;
  first_name?: string;
  last_name?: string;
  profile_pic?: string | null;
}

interface GroupMember {
  user_id: string | number;
  first_name: string;
  last_name: string;
  profile_pic?: string | null;
  role: string;
}

const AnnouncementCard = React.memo(({ announcement, defaultProfilePic, formatTime }: { announcement: Announcement, defaultProfilePic: string, formatTime: (d: string) => string }) => (
  <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
    <div className="flex items-start mb-3">
      <img
        src={announcement.profile_pic || defaultProfilePic}
        alt={`${announcement.first_name} ${announcement.last_name}`}
        className="w-11 h-11 rounded-full mr-4 border-2 border-white shadow-sm"
      />
      <div className="flex-1">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-bold text-gray-900 text-base">
              {announcement.first_name} {announcement.last_name}
            </h4>
            <h5 className="text-sm font-semibold text-blue-600 mt-0.5">{announcement.title}</h5>
          </div>
          <span className="text-xs text-gray-400 font-medium bg-gray-50 px-2 py-1 rounded-md">
            {formatTime(announcement.created_at)}
          </span>
        </div>
        <div className="mt-3 text-gray-600 text-sm leading-relaxed whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
          {announcement.message}
        </div>
      </div>
    </div>
  </div>
));

const Chat = () => {
  const { currentUser } = useUserContext();
  const {
    unseenMessages,
    refreshUnseenMessages,
    markPersonalMessagesAsSeen,
    markGroupMessagesAsSeen
  } = useUnseenMessages();

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGroupFormOpen, setIsGroupFormOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<(string | number)[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileView, setIsMobileView] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedChat, setSelectedChat] = useState<string | number | null>(null);
  const [selectedUserChat, setSelectedUserChat] = useState<string | number | null>(null);
  const [selectedGroupChat, setSelectedGroupChat] = useState<string | number | null>(null);
  const [isAnnouncementFormOpen, setIsAnnouncementFormOpen] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');

  const defaultProfilePic = 'https://img.freepik.com/premium-vector/avatar-profile-icon-flat-style-male-user-profile-vector-illustration-isolated-background-man-profile-sign-business-concept_157943-38764.jpg?semt=ais_hybrid';

  // Refs for accessing state inside socket listener without dependencies
  const selectedGroupChatRef = useRef(selectedGroupChat);
  const selectedUserChatRef = useRef(selectedUserChat);
  const usersRef = useRef(users);
  const currentUserRef = useRef(currentUser);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    selectedGroupChatRef.current = selectedGroupChat;
    selectedUserChatRef.current = selectedUserChat;
    usersRef.current = users;
    currentUserRef.current = currentUser;
  }, [selectedGroupChat, selectedUserChat, users, currentUser]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setShowSidebar(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  const fetchUsers = async () => {

    try {
      const response = await fetch(`${API_BASE_URL}/users`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      const usersData = Array.isArray(data) ? data : [];
      if (currentUser) {
        setUsers(usersData.filter(user => user.user_id !== currentUser.user_id));
      } else {
        setUsers(usersData);
      }
    } catch (err) {
      setError("Failed to load users");
      setUsers([]);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/chats/groups?user_id=${currentUser?.user_id}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setGroups(Array.isArray(data) ? data : []);
    } catch (err) {
      setError("Failed to load groups");
      setGroups([]);
    }
  };

  const fetchMessages = async () => {
    if (!selectedChat || !currentUser) return;

    setIsLoading(true);
    try {
      let url = `${API_BASE_URL}/chats/messages?user_id=${currentUser.user_id}`;

      if (selectedGroupChat) {
        url += `&group_id=${selectedGroupChat}`;
      } else if (selectedUserChat) {
        url += `&other_user_id=${selectedUserChat}`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      const messagesWithSenderInfo = data.map((msg: Message) => {
        if (msg.sender_id === currentUser.user_id) {
          return {
            ...msg,
            first_name: currentUser.first_name,
            last_name: currentUser.last_name,
            profile_pic: currentUser.profile_pic || defaultProfilePic,
            role: currentUser.role
          };
        }

        const sender = users.find(u => u.user_id === msg.sender_id);
        return {
          ...msg,
          first_name: sender?.first_name || '',
          last_name: sender?.last_name || '',
          profile_pic: sender?.profile_pic || defaultProfilePic,
          role: sender?.role || 'employee'
        };
      });

      setMessages(messagesWithSenderInfo);
    } catch (err) {
      setError("Failed to load messages");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGroupMembers = async (groupId: string | number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/chats/groups/${groupId}/members`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setGroupMembers(Array.isArray(data) ? data : []);
    } catch (err) {
      // Don't show error to user, just empty list
      setGroupMembers([]);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    if (selectedChat === 'announcements') {
      fetchAnnouncements();
    } else if (selectedUserChat) {
      fetchMessages();
      setGroupMembers([]);
    } else if (selectedGroupChat) {
      fetchMessages();
      fetchGroupMembers(selectedGroupChat);
    }
  }, [selectedChat, selectedUserChat, selectedGroupChat, currentUser]);

  // Socket.io Integration
  useEffect(() => {
    if (!currentUser) return;

    // Initialize socket only if it doesn't exist
    if (!socketRef.current) {
      socketRef.current = io(API_BASE_URL);
    }

    const socket = socketRef.current;

    const onConnect = () => {
      // Join personal room on connect
      socket.emit("join_room", `user_${currentUser.user_id}`);

      // If we already have a selected group, join it too (in case of reconnect)
      if (selectedGroupChatRef.current) {
        socket.emit("join_room", `group_${selectedGroupChatRef.current}`);
      }
    };



    const onReceiveMessage = (data: Message & { group_id?: number | string, receiver_id?: number | string }) => {


      setMessages((prevMessages) => {
        // Check if message already exists
        if (prevMessages.some(m => m.message_id === data.message_id)) return prevMessages;

        // Determine if the new message belongs to the CURRENTLY OPEN chat
        let isForCurrentChat = false;
        const currentSelectedGroupChat = selectedGroupChatRef.current;
        const currentSelectedUserChat = selectedUserChatRef.current;
        const currentUsers = usersRef.current;
        const currentLoggedInUser = currentUserRef.current;

        if (!currentLoggedInUser) return prevMessages;

        if (currentSelectedGroupChat && data.group_id && String(data.group_id) === String(currentSelectedGroupChat)) {
          isForCurrentChat = true;
        } else if (currentSelectedUserChat && !data.group_id) {
          // For 1-on-1, it matches if it's FROM the selected user OR TO the selected user (my own echo)
          if (String(data.sender_id) === String(currentLoggedInUser.user_id) && String(data.receiver_id) === String(currentSelectedUserChat)) {
            isForCurrentChat = true;
          } else if (String(data.sender_id) === String(currentSelectedUserChat) && String(data.receiver_id) === String(currentLoggedInUser.user_id)) {
            isForCurrentChat = true;
          }
        }

        if (isForCurrentChat) {
          const sender = currentUsers.find((u: User) => String(u.user_id) === String(data.sender_id));
          const isMe = String(data.sender_id) === String(currentLoggedInUser.user_id);

          const newMsg: Message = {
            message_id: data.message_id,
            sender_id: data.sender_id,
            message: data.message,
            created_at: data.created_at,
            first_name: isMe ? currentLoggedInUser.first_name : (data.first_name || sender?.first_name || 'Unknown'),
            last_name: isMe ? currentLoggedInUser.last_name : (data.last_name || sender?.last_name || ''),
            profile_pic: isMe ? currentLoggedInUser.profile_pic : (data.profile_pic || sender?.profile_pic || defaultProfilePic)
          };

          // Scroll to bottom
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
          return [...prevMessages, newMsg];
        } else {
          // If not current chat, refresh notifications
          refreshUnseenMessages();
          return prevMessages;
        }
      });
    };

    const onUserDeleted = (data: { id: string | number, type: string }) => {
      if (data.type === 'user') {
        fetchUsers();
        // If currently chatting with this user, clear selection
        if (String(selectedUserChatRef.current) === String(data.id)) {
          setSelectedUserChat(null);
          setSelectedChat(null);
          setMessages([]);
        }
      }
      // Also refresh groups as memberships/counts might have changed
      fetchGroups();
    };

    // Attach listeners
    if (!socket.hasListeners("connect")) socket.on("connect", onConnect);

    // Remove existing listener before adding new one
    socket.off("receive_message");
    socket.on("receive_message", onReceiveMessage);

    socket.off("user_deleted");
    socket.on("user_deleted", onUserDeleted);

    // Initial join if already connected
    if (socket.connected) {
      onConnect();
    }

    return () => {
      // Cleanup listeners
      socket.off("connect", onConnect);
      socket.off("receive_message", onReceiveMessage);
      socket.off("user_deleted", onUserDeleted);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentUser, refreshUnseenMessages]);

  // Separate effect for joining group rooms when selectedGroupChat changes
  useEffect(() => {
    if (!currentUser || !socketRef.current) return;
    const socket = socketRef.current;

    // Since we are reusing the socket, we just emit join/leave
    if (selectedGroupChat) {
      socket.emit("join_room", `group_${selectedGroupChat}`);
    }

    return () => {
      if (selectedGroupChat) {
        socket.emit("leave_room", `group_${selectedGroupChat}`);
      }
    };
  }, [currentUser, selectedGroupChat]);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, announcements]);

  const selectChat = React.useCallback((id: string | number, isGroup: boolean) => {
    if (isGroup) {
      setSelectedGroupChat(id);
      setSelectedUserChat(null);
      markGroupMessagesAsSeen(Number(id));
    } else {
      setSelectedUserChat(id);
      setSelectedGroupChat(null);
      markPersonalMessagesAsSeen(Number(id));
    }
    setSelectedChat(id);
    setIsGroupFormOpen(false);
    setIsAnnouncementFormOpen(false);
    setMessages([]);

    if (isMobileView) {
      setShowSidebar(false);
    }
  }, [isMobileView, markGroupMessagesAsSeen, markPersonalMessagesAsSeen]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getChatName = () => {
    if (selectedChat === 'announcements') return 'Announcements';

    if (selectedUserChat) {
      const user = users.find(u => u.user_id === selectedUserChat);
      return user ? `${user.first_name} ${user.last_name}` : '';
    }

    if (selectedGroupChat) {
      const group = groups.find(g => g.group_id === selectedGroupChat);
      return group ? group.group_name : '';
    }

    return '';
  };

  const getChatAvatar = () => {
    if (selectedChat === 'announcements') {
      return 'https://cdn-icons-png.flaticon.com/512/2098/2098402.png';
    }

    if (selectedUserChat) {
      const user = users.find(u => u.user_id === selectedUserChat);
      return user?.profile_pic || defaultProfilePic;
    }

    if (selectedGroupChat) {
      return defaultProfilePic;
    }

    return defaultProfilePic;
  };

  const filteredUsers = React.useMemo(() => {
    const query = searchQuery.toLowerCase();
    return users.filter(user =>
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
    if (!isChatOpen && isMobileView) {
      setShowSidebar(true);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEmployeeSelection = (userId: string | number) => {
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const fetchAnnouncements = async () => {
    if (!currentUser) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/announcements`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      const announcementsWithUserData = await Promise.all(
        data.map(async (announcement: Announcement) => {
          if (announcement.first_name && announcement.last_name) {
            return announcement;
          }

          try {
            const userResponse = await fetch(`${API_BASE_URL}/users/${announcement.auth_id}`);
            if (!userResponse.ok) return announcement;

            const userData = await userResponse.json();
            return {
              ...announcement,
              first_name: userData.first_name,
              last_name: userData.last_name,
              profile_pic: userData.profile_pic || defaultProfilePic
            };
          } catch (err) {
            return announcement;
          }
        })
      );

      setAnnouncements(announcementsWithUserData);
    } catch (err) {
      setError("Failed to load announcements");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnnouncementClick = () => {
    setSelectedChat('announcements');
    setSelectedGroupChat(null);
    setSelectedUserChat(null);
    setMessages([]);
    setIsAnnouncementFormOpen(false);

    if (isMobileView) {
      setShowSidebar(false);
    }
  };

  const handleSendAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementMessage.trim() || !currentUser) return;

    try {
      const response = await axios.post(`${API_BASE_URL}/announcements`, {
        auth_id: currentUser.auth_id,
        title: announcementTitle,
        message: announcementMessage
      });

      const newAnnouncement = {
        ...response.data,
        first_name: currentUser.first_name,
        last_name: currentUser.last_name,
        profile_pic: currentUser.profile_pic || defaultProfilePic,
        created_at: new Date().toISOString()
      };

      setAnnouncements(prev => [newAnnouncement, ...prev]);
      setAnnouncementTitle('');
      setAnnouncementMessage('');
      setIsAnnouncementFormOpen(false);
    } catch (err) {
      setError("Failed to post announcement");
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMembers.length === 0 || !currentUser) return;

    try {
      const response = await axios.post(`${API_BASE_URL}/chats/groups`, {
        group_name: groupName,
        creator_id: currentUser.user_id,
        members: [currentUser.user_id, ...selectedMembers]
      });

      if (response.data.success) {
        await fetchGroups();
        setIsGroupFormOpen(false);
        setGroupName('');
        setSelectedMembers([]);
      }
    } catch (err: any) {
      setError("Failed to create group");
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || !currentUser) return;

    try {
      if (selectedGroupChat) {
        await axios.post(`${API_BASE_URL}/chats/messages`, {
          sender_id: currentUser.user_id,
          group_id: selectedGroupChat,
          message: newMessage
        });



        // Remove local append to rely on socket
        setNewMessage('');
      }
      else if (selectedUserChat) {
        await axios.post(`${API_BASE_URL}/chats/messages`, {
          sender_id: currentUser.user_id,
          receiver_id: selectedUserChat,
          message: newMessage
        });



        // Optimistic UI update is handled by Socket.io receive_message now?
        // Actually, for better UX, we might want to keep the local append or wait for socket.
        // Given we emit "receive_message" to ourselves from backend, we can rely on that!
        // So we REMOVE the setMessages here to avoid duplicate (one from local, one from socket).
        // OR we can keep it and add logic to deduplicate.
        // Easiest path: Don't setMessages locally here. Let the socket event handle it.
        // BUT: if socket fails/lags, user waits.
        // Better path: Append locally, but verify ID. DB insertion returns ID. Socket message returns same ID.
        // We will remove local append here and rely on socket for consistency across tabs.

        setNewMessage('');

        // No explicit scroll needed here, the socket event listener will trigger it.

      }
    } catch (err: any) {
      setError(`Failed to send message: ${err.response?.data?.message || err.message}`);
    }
  };

  useEffect(() => {
    if (!currentUser) return;

    const fetchInitialData = async () => {
      await Promise.all([
        fetchUsers(),
        fetchGroups(),
        refreshUnseenMessages(),
        fetchAnnouncements()
      ]);
    };

    fetchInitialData();
  }, [currentUser, refreshUnseenMessages]);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Chat Button */}
      <button
        onClick={toggleChat}
        className="flex items-center justify-center w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all transform hover:scale-110"
      >
        {isChatOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* Chat Modal */}
      {isChatOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-end p-2 md:p-4">
          <div className={`bg-white rounded-xl shadow-2xl flex flex-col md:flex-row w-full max-w-full md:max-w-4xl h-[90vh] md:h-[80vh] overflow-hidden ${isMobileView ? 'w-full' : ''}`}>
            {/* Sidebar Toggle Button (Mobile Only) */}
            {isMobileView && !showSidebar && (
              <button
                onClick={toggleSidebar}
                className="md:hidden absolute top-4 left-4 z-10 bg-white p-2 rounded-full shadow-md"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            )}

            {/* Sidebar */}
            {(showSidebar || !isMobileView) && (
              <div className={`${isMobileView ? 'w-full' : 'w-full md:w-1/3'} border-r border-gray-200 bg-gray-50 flex flex-col`}>
                <div className="p-4 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">Workplace Chat</h2>
                    </div>
                    {isMobileView && (
                      <button
                        onClick={toggleSidebar}
                        className="md:hidden text-gray-500 hover:text-gray-700"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-hide">
                  {/* Announcements Section */}
                  <div
                    onClick={handleAnnouncementClick}
                    className={`flex items-center p-3 rounded-lg cursor-pointer ${selectedChat === 'announcements' ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
                  >
                    <div className="bg-yellow-100 p-2 rounded-full mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">Announcements</h3>
                      <p className="text-xs text-gray-500">Admin updates and notices</p>
                    </div>
                    {announcements.length > 0 && (
                      <span className="bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
                        {announcements.length}
                      </span>
                    )}
                  </div>

                  {/* Employees Section */}
                  <div className="p-2">
                    <h3 className="px-3 py-2 text-sm font-semibold text-gray-500 uppercase tracking-wider">Employees</h3>
                    {users.map(user => (
                      <div
                        key={user.user_id}
                        onClick={() => selectChat(user.user_id, false)}
                        className={`flex items-center p-3 rounded-lg cursor-pointer ${selectedChat === user.user_id ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
                      >
                        <img
                          src={user.profile_pic || defaultProfilePic}
                          alt={`${user.first_name} ${user.last_name}`}
                          className="w-10 h-10 rounded-full mr-3"
                        />
                        <div>
                          <h3 className="font-medium">{user.first_name} {user.last_name}</h3>
                          <p className="text-xs text-gray-500">{user.role}</p>
                        </div>
                        {unseenMessages.personal_chats[user.user_id] > 0 && (
                          <span className="ml-auto bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
                            {unseenMessages.personal_chats[user.user_id]}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Groups Section */}
                  <div className="p-2">
                    <div className="flex justify-between items-center px-3 py-2">
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Groups</h3>
                      <button
                        onClick={() => {
                          setIsGroupFormOpen(true);
                          setIsAnnouncementFormOpen(false);
                          setSelectedChat(null);
                          setSelectedGroupChat(null);
                          setSelectedUserChat(null);
                          if (isMobileView) setShowSidebar(false);
                        }}
                        className="text-gray-500 hover:text-blue-600 transition-colors"
                        title="Create New Group"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                    {groups.filter(g => !g.is_announcement).map(group => (
                      <div
                        key={group.group_id}
                        onClick={() => selectChat(group.group_id, true)}
                        className={`flex items-center p-3 rounded-lg cursor-pointer ${selectedChat === group.group_id ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
                      >
                        <img
                          src="https://cdn-icons-png.freepik.com/512/5493/5493616.png"
                          alt={group.group_name}
                          className="w-10 h-10 rounded-full mr-3"
                        />
                        <div className="flex-1">
                          <h3 className="font-medium">{group.group_name}</h3>
                          <p className="text-xs text-gray-500">
                            {group.message_count || 0} messages
                          </p>
                        </div>
                        {unseenMessages.group_chats[group.group_id] > 0 && (
                          <span className="bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
                            {unseenMessages.group_chats[group.group_id]}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
              {isGroupFormOpen ? (
                <div className="flex-1 flex flex-col">
                  {/* Create Group Header */}
                  <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-800">Create New Group</h2>
                    <button
                      onClick={() => {
                        setIsGroupFormOpen(false);
                        if (isMobileView) setShowSidebar(true);
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Group Form */}
                  <div className="flex-1 p-4 overflow-y-auto scrollbar-hide">
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                      <input
                        type="text"
                        placeholder="e.g., Project Team"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Add Members</label>
                      <input
                        type="text"
                        placeholder="Search employees..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-3"
                      />
                      <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                        {filteredUsers.map(user => (
                          <div key={user.user_id} className="flex items-center p-3 hover:bg-gray-50">
                            <input
                              type="checkbox"
                              checked={selectedMembers.includes(user.user_id)}
                              onChange={() => handleEmployeeSelection(user.user_id)}
                              className="mr-3"
                            />
                            <img
                              src={user.profile_pic || defaultProfilePic}
                              alt={`${user.first_name} ${user.last_name}`}
                              className="w-8 h-8 rounded-full mr-2"
                            />
                            <div>
                              <p className="text-sm font-medium">{user.first_name} {user.last_name}</p>
                              <p className="text-xs text-gray-500">{user.role}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {selectedMembers.length > 0 && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Selected Members ({selectedMembers.length})</label>
                        <div className="flex flex-wrap gap-2">
                          {selectedMembers.map(userId => {
                            const user = users.find(u => u.user_id === userId);
                            return (
                              <div key={userId} className="flex items-center bg-blue-50 text-blue-800 px-3 py-1 rounded-full text-sm">
                                <img
                                  src={user?.profile_pic || defaultProfilePic}
                                  alt={`${user?.first_name} ${user?.last_name}`}
                                  className="w-5 h-5 rounded-full mr-1"
                                />
                                {user?.first_name}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Form Actions */}
                  <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <button
                      onClick={handleCreateGroup}
                      disabled={!groupName.trim() || selectedMembers.length === 0}
                      className={`w-full py-3 px-4 rounded-lg font-medium ${!groupName.trim() || selectedMembers.length === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                    >
                      Create Group
                    </button>
                  </div>
                </div>
              ) : selectedChat === 'announcements' ? (
                <div className="flex-1 flex flex-col h-full">
                  {/* Announcements Header */}
                  <div className="p-4 border-b border-gray-200 flex items-center sticky top-0 bg-white z-10">
                    {isMobileView && !showSidebar && (
                      <button onClick={toggleSidebar} className="mr-2 text-gray-500 hover:text-gray-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                    <img
                      src={getChatAvatar()}
                      alt={getChatName()}
                      className="w-10 h-10 rounded-full mr-3"
                    />
                    <div className="flex-1 min-w-0">
                      <h2 className="font-bold text-gray-800 truncate">{getChatName()}</h2>
                      <p className="text-xs text-gray-500 truncate">Admin announcements</p>
                    </div>
                    {currentUser?.role === 'admin' && !isAnnouncementFormOpen && (
                      <button
                        onClick={() => setIsAnnouncementFormOpen(true)}
                        className="ml-2 px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                      >
                        New Announcement
                      </button>
                    )}
                    <button onClick={toggleChat} className="ml-auto text-gray-500 hover:text-gray-700">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Announcement Content */}
                  <div className="flex-1 overflow-y-auto bg-gray-50 p-4 scrollbar-hide">
                    {isAnnouncementFormOpen ? (
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4">
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                          <input
                            type="text"
                            placeholder="Announcement title"
                            value={announcementTitle}
                            onChange={(e) => setAnnouncementTitle(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                          <textarea
                            placeholder="Announcement details"
                            value={announcementMessage}
                            onChange={(e) => setAnnouncementMessage(e.target.value)}
                            rows={4}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => setIsAnnouncementFormOpen(false)}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSendAnnouncement}
                            disabled={!announcementTitle.trim() || !announcementMessage.trim()}
                            className={`px-4 py-2 rounded-lg font-medium text-white ${!announcementTitle.trim() || !announcementMessage.trim() ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                          >
                            Post Announcement
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {isLoading ? (
                      <div className="flex flex-col items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                        <p className="text-gray-500">Loading announcements...</p>
                      </div>
                    ) : error ? (
                      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <h3 className="mt-4 text-lg font-medium text-gray-700">Error loading announcements</h3>
                        <p className="mt-1 text-sm text-gray-500">{error}</p>
                        <button
                          onClick={fetchAnnouncements}
                          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Retry
                        </button>
                      </div>
                    ) : announcements.length > 0 ? (
                      <div className="space-y-4">
                        {announcements.map(announcement => (
                          <AnnouncementCard 
                            key={announcement.announcement_id} 
                            announcement={announcement} 
                            defaultProfilePic={defaultProfilePic} 
                            formatTime={formatTime} 
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center p-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        <h3 className="mt-4 text-lg font-medium text-gray-700">No announcements yet</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {currentUser?.role === 'admin'
                            ? "Post the first announcement to share with everyone"
                            : "No announcements have been posted yet"}
                        </p>
                        {currentUser?.role === 'admin' && (
                          <button
                            onClick={() => setIsAnnouncementFormOpen(true)}
                            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            Create Announcement
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col h-full">
                  {/* Chat Header */}
                  <div className="p-4 border-b border-gray-200 flex items-center sticky top-0 bg-white z-10">
                    {isMobileView && !showSidebar && (
                      <button
                        onClick={toggleSidebar}
                        className="mr-2 text-gray-500 hover:text-gray-700"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                    <img
                      src={getChatAvatar()}
                      alt={getChatName()}
                      className="w-10 h-10 rounded-full mr-3"
                    />
                    <div className="flex-1 min-w-0">
                      <h2 className="font-bold text-gray-800 truncate">{getChatName()}</h2>
                      <p className="text-xs text-gray-500 whitespace-normal break-words">
                        {selectedGroupChat
                          ? groupMembers.map(m => `${m.first_name} ${m.last_name}`).join(', ')
                          : users.find(u => u.user_id === selectedUserChat)?.role === 'admin'
                            ? 'Admin'
                            : 'Employee'}
                      </p>
                    </div>
                    <button
                      onClick={toggleChat}
                      className="ml-auto text-gray-500 hover:text-gray-700"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto bg-gray-50 scrollbar-hide" style={{
                    maxHeight: 'calc(100vh - 200px)',
                    padding: '1rem'
                  }}>
                    {isLoading ? (
                      <div className="flex justify-center items-center h-full">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
                      </div>
                    ) : messages.length > 0 ? (
                      <div className="space-y-3 p-4">
                        {messages.map(message => (
                          <div
                            key={message.message_id}
                            className={`flex ${message.sender_id === currentUser?.user_id
                              ? 'justify-end'
                              : 'justify-start'
                              }`}
                          >
                            {message.sender_id !== currentUser?.user_id && (
                              <img
                                src={message.profile_pic || defaultProfilePic}
                                alt={`${message.first_name} ${message.last_name}`}
                                className="w-8 h-8 rounded-full mr-2 mt-1"
                              />
                            )}
                            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${message.sender_id === currentUser?.user_id
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border border-gray-200'
                              }`}>
                              {message.sender_id !== currentUser?.user_id && (
                                <p className="text-xs font-semibold text-gray-700 mb-1">
                                  {message.first_name} {message.last_name}
                                </p>
                              )}
                              <p className={
                                message.sender_id === currentUser?.user_id
                                  ? 'text-white'
                                  : 'text-gray-800'
                              }>
                                {message.message}
                              </p>
                              <p className={`text-xs mt-1 ${message.sender_id === currentUser?.user_id
                                ? 'text-blue-200'
                                : 'text-gray-500'
                                }`}>
                                {formatTime(message.created_at)}
                              </p>
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center p-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <h3 className="mt-4 text-lg font-medium text-gray-700">No messages yet</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {selectedGroupChat
                            ? "Send the first message in this group"
                            : "Send your first message to start the conversation"}
                        </p>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  {selectedChat && (
                    <div className="p-4 border-t border-gray-200 bg-white sticky bottom-0">
                      <div className="flex items-center">
                        <input
                          type="text"
                          placeholder={`Message ${getChatName()}...`}
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={handleKeyPress}
                          className="flex-1 p-3 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          onClick={handleSendMessage}
                          disabled={!newMessage.trim()}
                          className={`px-4 py-3 rounded-r-lg font-medium ${!newMessage.trim() ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;