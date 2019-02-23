import EventEmitter from "events";
import superagent, { Request, Response, ProgressEvent } from "superagent";
import Configuration from "@/../../config.json";

interface PasteData {
  paste: string;
}

export default class UploadHandler extends EventEmitter {
  public currentUpload: Request | null = null;

  public async upload(data: FormData | PasteData): Promise<Response> {
    if (this.currentUpload) {
      return Promise.reject(
        new Error("There is already an ongoing request while attempting to start a new one!`")
      );
    }

    const uploadEndpoint: string = data instanceof FormData ? "file" : "paste";

    this.currentUpload = superagent
      .post(`${Configuration.BACKEND_URL}/upload/${uploadEndpoint}`)
      .send(data)
      .on("progress", (event: ProgressEvent): boolean => this.emit("progress", event));

    try {
      const response: Response = await this.currentUpload;
      this.currentUpload = null;
      return Promise.resolve(response);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  public abortCurrentUpload(): Promise<UploadHandler> {
    if (!this.currentUpload) {
      return Promise.reject(
        new Error("There is no ongoing requests to abort!")
      );
    }

    this.currentUpload.abort();
    this.currentUpload = null;

    return Promise.resolve(this);
  }
}