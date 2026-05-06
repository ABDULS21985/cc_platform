import { beforeEach, describe, expect, it, vi } from 'vitest';

const axiosMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/lib/axios', () => ({
  default: axiosMock,
}));

import { ApiService } from '../api';

beforeEach(() => {
  Object.values(axiosMock).forEach((fn) => fn.mockReset());
});

describe('ApiService route mirrors', () => {
  it('mirrors institution list/create/get routes', () => {
    ApiService.institutions.list({ limit: 10, offset: 5 });
    expect(axiosMock.get).toHaveBeenCalledWith('/v2/institutions', {
      params: { limit: 10, offset: 5 },
    });

    ApiService.institutions.create({ name: 'Cooperative', description: null });
    expect(axiosMock.post).toHaveBeenCalledWith('/v2/institutions', {
      name: 'Cooperative',
      description: null,
    });

    ApiService.institutions.get(7);
    expect(axiosMock.get).toHaveBeenCalledWith('/v2/institutions/7');
  });

  it('mirrors community admin, media, member, and transfer routes', () => {
    ApiService.communities.admin({ limit: 20 });
    expect(axiosMock.get).toHaveBeenCalledWith('/v2/community/me/admin', {
      params: { limit: 20 },
    });

    ApiService.communities.getAdminOverview();
    expect(axiosMock.get).toHaveBeenCalledWith('/v2/community/me/overview');

    ApiService.communities.getBillsSummary();
    expect(axiosMock.get).toHaveBeenCalledWith('/v2/community/me/bills-summary');

    ApiService.communities.getOverview(3);
    expect(axiosMock.get).toHaveBeenCalledWith('/v2/community/3/overview');

    ApiService.communities.updateCoverPhoto(3, { url: 'https://cdn.test/cover.jpg' });
    expect(axiosMock.put).toHaveBeenCalledWith('/v2/community/3/cover-photo', {
      url: 'https://cdn.test/cover.jpg',
    });

    ApiService.communities.updateProfilePicture(3, {
      url: 'https://cdn.test/avatar.jpg',
    });
    expect(axiosMock.put).toHaveBeenCalledWith('/v2/community/3/profile-picture', {
      url: 'https://cdn.test/avatar.jpg',
    });

    ApiService.communities.suspendMember(3, 9);
    expect(axiosMock.post).toHaveBeenCalledWith('/v2/community/3/members/9/suspend');

    ApiService.communities.getTransferStatus(3, 'ref-123');
    expect(axiosMock.get).toHaveBeenCalledWith('/v2/community/3/transfer/ref-123');
  });

  it('mirrors single-post and comment routes', () => {
    ApiService.communities.getPost(12);
    expect(axiosMock.get).toHaveBeenCalledWith('/v2/community/posts/12');

    ApiService.communities.updatePost(12, {
      body: 'Edited',
      comments_enabled: false,
    });
    expect(axiosMock.put).toHaveBeenCalledWith('/v2/community/posts/12', {
      body: 'Edited',
      comments_enabled: false,
    });

    ApiService.communities.deletePostComment(18);
    expect(axiosMock.delete).toHaveBeenCalledWith('/v2/community/posts/comments/18');
  });

  it('keeps wallet PIN lifecycle mirrors available', () => {
    ApiService.wallet.setPin({ pin: '1234' });
    expect(axiosMock.post).toHaveBeenCalledWith('/v2/wallet/pin/set', {
      pin: '1234',
    });

    ApiService.wallet.changePin({ old_pin: '1234', new_pin: '5678' });
    expect(axiosMock.post).toHaveBeenCalledWith('/v2/wallet/pin/change', {
      old_pin: '1234',
      new_pin: '5678',
    });

    ApiService.wallet.requestPinReset();
    expect(axiosMock.post).toHaveBeenCalledWith('/v2/wallet/pin/reset/request');

    ApiService.wallet.confirmPinReset({ otp: '000111', new_pin: '5678' });
    expect(axiosMock.post).toHaveBeenCalledWith('/v2/wallet/pin/reset/confirm', {
      otp: '000111',
      new_pin: '5678',
    });
  });
});
