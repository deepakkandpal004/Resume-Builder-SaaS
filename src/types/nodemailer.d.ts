declare module "nodemailer" {
  interface TransportOptions {
    host?: string;
    port?: number;
    secure?: boolean;
    auth?: {
      user?: string;
      pass?: string;
    };
  }

  interface SentMessageInfo {
    messageId: string;
  }

  interface Transporter {
    sendMail(options: {
      from?: string;
      to?: string | string[];
      subject?: string;
      html?: string;
      text?: string;
    }): Promise<SentMessageInfo>;
  }

  function createTransport(options: TransportOptions): Transporter;
}
