import { renderHook, act } from "@testing-library/react-hooks";
import { useQuery } from "./useQuery";
import gql from "graphql-tag";
import { FinchMessageKey } from "../types";

const testDoc = gql`
  query foo {
    bar
  }
`;

describe("useQuery", () => {
  beforeEach(() => {
    chrome.runtime.lastError = undefined;
    chrome.runtime.sendMessage = jest.fn();
  });
  it("should send a message to the background", async () => {
    const sendMessageMock = jest
      .fn()
      .mockImplementation((message, callback) => {
        setTimeout(() => {
          callback({ data: { bar: true } });
        }, 0);
      });
    chrome.runtime.sendMessage = sendMessageMock;

    const wrapper = renderHook(() => useQuery(testDoc, {}));

    await wrapper.waitForNextUpdate();

    expect(sendMessageMock.mock.calls[0][0]).toEqual({
      query: testDoc,
      variables: {},
      type: FinchMessageKey.Generic,
    });

    expect(wrapper.result.current.data).toEqual({ bar: true });
  });
  it("should return an error if a last error is set", async () => {
    const sendMessageMock = jest
      .fn()
      .mockImplementation((message: unknown, callback) => {
        callback(null);
      });
    chrome.runtime.sendMessage = sendMessageMock;
    chrome.runtime.lastError = new Error("foo");

    const wrapper = renderHook(() => useQuery(testDoc, {}));

    await wrapper.waitForNextUpdate();

    expect(wrapper.result.current.error.message).toBe("foo");
  });
  it("refetch should send another message", async () => {
    const sendMessageMock = jest
      .fn()
      .mockImplementation((message, callback) => {
        setTimeout(() => {
          callback({ data: { bar: true } });
        }, 0);
      });
    chrome.runtime.sendMessage = sendMessageMock;

    const wrapper = renderHook(() => useQuery(testDoc, {}));

    await wrapper.waitForNextUpdate();
    await act(async () => {
      await wrapper.result.current.refetch();
    });

    expect(sendMessageMock).toBeCalledTimes(2);

    expect(sendMessageMock.mock.calls[1][0]).toEqual({
      query: testDoc,
      variables: {},
      type: FinchMessageKey.Generic,
    });
  });
});