import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { Client } from '@stomp/stompjs'

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref([])
  const stompClient = ref(null)
  
  const unreadCount = computed(() => notifications.value.length) // 簡化：所有在陣列裡的都算未讀

  // 1. 建立 WebSocket 連線
  function connect() {
    if (stompClient.value && stompClient.value.active) {
      return // 已經連線了
    }

    const client = new Client({
      // 使用原生 WebSocket 連線
      brokerURL: 'ws://localhost:8080/ws',
      debug: function (str) {
        console.log('STOMP: ' + str)
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    })

    client.onConnect = (frame) => {
      console.log('Connected WebSocket: ' + frame)
      
      // 訂閱後端的廣播頻道
      client.subscribe('/topic/admin/notifications', (message) => {
        if (message.body) {
          const newNotification = JSON.parse(message.body)
          // 收到新通知，塞入陣列最前面
          notifications.value.unshift(newNotification)
        }
      })
    }

    client.onStompError = (frame) => {
      console.error('Broker reported error: ' + frame.headers['message'])
      console.error('Additional details: ' + frame.body)
    }

    client.activate()
    stompClient.value = client
  }

  // 2. 斷開連線
  function disconnect() {
    if (stompClient.value) {
      stompClient.value.deactivate()
      stompClient.value = null
    }
  }

  // 3. 將全部標示為已讀 (直接清空陣列)
  function clearAll() {
    notifications.value = []
  }

  return {
    notifications,
    unreadCount,
    connect,
    disconnect,
    clearAll
  }
})
