import { Presence } from "phoenix";

import Player from "./player";

let Video = {
  init(socket, element) {
    if (!element) {
      return;
    }
    let playerId = element.getAttribute("data-player-id");
    let videoId = element.getAttribute("data-id");

    socket.connect();

    Player.init(element.id, playerId, () => {
      this.onReady(videoId, socket);
    });
  },

  onReady(videoId, socket) {
    const msgContainer = document.getElementById("msg-container");
    const msgInput = document.getElementById("msg-input");
    const postButton = document.getElementById("msg-submit");
    const userList = document.getElementById("user-list");
    let lastSeenId = 0;
    const vidChannel = socket.channel("videos:" + videoId, () => {
      return { last_seen_id: lastSeenId };
    });

    const presence = new Presence(vidChannel);

    presence.onSync(() => {
      userList.innerHTML = presence
        .list((id, { user: user, metas: [first, ...rest] }) => {
          const count = rest.length + 1;
          return `<li>${user.username}: (${count})</li>`;
        })
        .join("");
    });

    postButton.addEventListener("click", () => {
      const payload = { body: msgInput.value, at: Player.getCurrentTime() };

      vidChannel
        .push("new_annotation", payload)
        .receive("error", (e) => console.log(e));

      msgInput.value = "";
    });

    vidChannel.on("new_annotation", (resp) => {
      lastSeenId = resp.id;
      this.renderAnnotation(msgContainer, resp);
    });

    msgContainer.addEventListener("click", (e) => {
      e.preventDefault();

      const seconds =
        e.target.getAttribute("data-seek") ||
        e.target.parentNode.getAttribute("data-seek");

      if (!seconds) {
        return;
      }

      Player.seekTo(seconds);
    });

    vidChannel
      .join()
      .receive("ok", (resp) => {
        const ids = resp.annotations.map((annotation) => annotation.id);

        if (ids.length > 0) {
          lastSeenId = Math.max(...ids);
        }
        this.scheduleMessages(msgContainer, resp.annotations);
      })
      .receive("error", (reason) => console.log("join failed", reason));
  },

  esc(str) {
    const div = document.createElement("div");
    div.appendChild(document.createTextNode(str));

    return div.innerHTML;
  },

  renderAnnotation(msgContainer, { user, body, at }) {
    const template = document.createElement("div");

    template.innerHTML = `
      <a href="#" data-seek="${this.esc(at)}">
        [${this.formatTime(at)}]
        <b>${this.esc(user.username)}</b>: ${this.esc(body)}
      </a>
    `;

    msgContainer.appendChild(template);
    msgContainer.scrollTop = msgContainer.scrollHeight;
  },

  scheduleMessages(msgContainer, annotations) {
    clearTimeout(this.scheduleTimer);
    this.scheduleTimer = setTimeout(() => {
      const currentTime = Player.getCurrentTime();
      const remaining = this.renderAtTime(
        annotations,
        currentTime,
        msgContainer
      );

      this.scheduleMessages(msgContainer, remaining);
    }, 1000);
  },

  renderAtTime(annotations, seconds, msgContainer) {
    return annotations.filter((annotation) => {
      if (annotation.at > seconds) {
        return true;
      } else {
        this.renderAnnotation(msgContainer, annotation);
        return false;
      }
    });
  },

  formatTime(at) {
    const date = new Date(null);
    date.setSeconds(at / 1000);

    return date.toISOString().substring(14, 19);
  },
};

export default Video;
