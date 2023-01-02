defmodule RumblWeb.UserSocket do
  use Phoenix.Socket

  ## Channels

  channel "videos:*", RumblWeb.VideoChannel

  # channel "room:*", RumblWeb.RoomChannel

  def connect(_params, socket, _connect_info) do
    {:ok, socket}
  end

  def id(_socket), do: nil
end
