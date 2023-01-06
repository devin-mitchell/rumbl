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
    const vidChannel = socket.channel("videos:" + videoId);

    postButton.addEventListener("click", () => {
      const payload = { body: msgInput.value, at: Player.getCurrentTime() };

      vidChannel
        .push("new_annotation", payload)
        .receive("error", (e) => console.log(e));

      msgInput.value = "";
    });

    vidChannel.on("new_annotation", (resp) => {
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
      .receive("ok", (resp) =>
        this.scheduleMessages(msgContainer, resp.annotations)
      )
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
