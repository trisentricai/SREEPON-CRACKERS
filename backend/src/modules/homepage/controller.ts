import type { Request, Response } from 'express';
import { getValidatedQuery } from '../../middleware/validation.middleware';
import { asyncHandler, HttpStatus, ok, routeParam } from '../../utils/http';
import type { ListSectionsQuery, ReorderSectionsInput } from './schema';
import * as service from './service';

export const getHomepage = asyncHandler(async (_req: Request, res: Response) => {
  const homepage = await service.getHomepage();
  res.json(ok(homepage, 'Homepage'));
});

export const getHomepageConfig = asyncHandler(async (_req: Request, res: Response) => {
  const result = await service.getHomepageConfig();
  res.json(ok(result, 'Homepage config'));
});

export const updateHomepageConfig = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.updateHomepageConfig(req.body);
  res.json(ok(result, 'Homepage config saved'));
});

export const listSections = asyncHandler(async (req: Request, res: Response) => {
  const query = getValidatedQuery<ListSectionsQuery>(req);
  const sections = await service.listSections(query);
  res.json(ok(sections, `${sections.length} homepage section(s)`));
});

export const createSection = asyncHandler(async (req: Request, res: Response) => {
  const section = await service.createSection(req.body);
  res.status(HttpStatus.CREATED).json(ok(section, 'Homepage section created'));
});

export const updateSection = asyncHandler(async (req: Request, res: Response) => {
  const section = await service.updateSection(routeParam(req, 'id'), req.body);
  res.json(ok(section, 'Homepage section updated'));
});

export const deleteSectionController = asyncHandler(async (req: Request, res: Response) => {
  await service.deleteSection(routeParam(req, 'id'));
  res.status(HttpStatus.NO_CONTENT).send();
});

export const reorderSections = asyncHandler(async (req: Request, res: Response) => {
  const sections = await service.reorderSections((req.body as ReorderSectionsInput).items);
  res.json(ok(sections, 'Homepage section order saved'));
});